// Top-level imports
import {
    AutoTokenizer,
    AutoModelForCausalLM,
    TextStreamer,
    InterruptableStoppingCriteria,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/+esm';

console.log('Worker: Starting initialization...');

async function check() {
    console.log('Worker: Checking WebGPU support...');
    try {
        if (!navigator.gpu) {
            throw new Error('WebGPU API is not available in this browser');
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error('No WebGPU adapter found (GPU may be unsupported or disabled)');
        }
        console.log('Worker: WebGPU supported:', adapter);
        const adapterName = adapter.info?.name || 'GPU Adapter';
        self.postMessage({ status: 'webgpu_supported', data: adapterName });
    } catch (e) {
        console.error('Worker: WebGPU check failed:', e);
        self.postMessage({ status: 'error', data: `WebGPU check failed: ${e.message || e.toString()}` });
    }
}

class TextGenerationPipeline {
    static tokenizer = null;
    static model = null;
    static currentModelId = null;
    static currentDatatype = null;

    static async getInstance(model_id, dtype, progress_callback = null) {
        console.log(`Worker: Loading tokenizer and model with model_id: ${model_id}, dtype: ${dtype}`);
        try {
            // Only load new tokenizer and model if model_id or dtype has changed
            if (model_id !== this.currentModelId || dtype !== this.currentDatatype) {
                console.log('Worker: Model ID or datatype changed, clearing cache');
                this.tokenizer = null;
                this.model = null;
                this.currentModelId = model_id;
                this.currentDatatype = dtype;
            }

            this.tokenizer ??= await AutoTokenizer.from_pretrained(model_id, { progress_callback });
            console.log('Worker: Tokenizer loaded');
            this.model ??= await AutoModelForCausalLM.from_pretrained(model_id, {
                dtype: dtype,
                device: 'webgpu',
                progress_callback,
            });
            console.log('Worker: Model loaded');
            return { tokenizer: this.tokenizer, model: this.model };
        } catch (e) {
            console.error('Worker: Model loading failed:', e);
            // Check if error is related to offline access
            if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                self.postMessage({ status: 'error', data: 'Offline: Model files not cached. Please connect to the internet to cache the model.' });
            } else {
                self.postMessage({ status: 'error', data: `Model loading failed: ${e.message || e.toString()}` });
            }
            throw e;
        }
    }
}

const stopping_criteria = new InterruptableStoppingCriteria();
let past_key_values_cache = null;

async function generate({ messages, temperature, topK }) {
    console.log('Worker: Generating with messages:', messages, 'temperature:', temperature, 'topK:', topK);
    try {
        const pipeline = await TextGenerationPipeline.getInstance(
            TextGenerationPipeline.currentModelId || 'HuggingFaceTB/SmolLM2-135M-Instruct', //'HuggingFaceTB/SmolLM2-1.7B-Instruct',
            TextGenerationPipeline.currentDatatype || 'q4f16'
        );
        const { tokenizer, model } = pipeline;
        const inputs = tokenizer.apply_chat_template(messages, {
            add_generation_prompt: true,
            return_dict: true,
        });
        console.log('Worker: Tokenized inputs:', inputs);

        let generatedText = ''; // Accumulate new assistant tokens
        let startTime;
        let numTokens = 0;
        const token_callback_function = () => {
            startTime ??= performance.now();
            numTokens++;
        };
        const callback_function = (output) => {
            generatedText += output; // Accumulate only new tokens
            self.postMessage({ status: 'update', output });
        };

        const streamer = new TextStreamer(tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
            callback_function,
            token_callback_function,
        });

        self.postMessage({ status: 'start' });

        const { past_key_values } = await model.generate({
            ...inputs,
            past_key_values: past_key_values_cache,
            max_new_tokens: 5000,
            do_sample: true,
            temperature,
            top_k: topK,
            streamer,
            stopping_criteria,
        });
        past_key_values_cache = past_key_values;

        // Clean up generated text to remove any residual template tokens
        const cleanText = generatedText.replace(/<\|im_start\|>assistant/g, '')
                                      .replace(/<\|im_end\|>/g, '')
                                      .trim();
        console.log('Worker: Generated output:', cleanText);
        self.postMessage({ status: 'complete', output: [cleanText] });
    } catch (e) {
        console.error('Worker: Generation failed:', e);
        self.postMessage({ status: 'error', data: `Generation failed: ${e.message || e.toString()}` });
    }
}

async function load({ modelId, datatype }) {
    console.log('Worker: Starting model load with modelId:', modelId, 'datatype:', datatype);
    self.postMessage({ status: 'loading', data: 'Loading model...' });
    try {
        const pipeline = await TextGenerationPipeline.getInstance(modelId, datatype, (x) => {
            console.log('Worker: Progress update:', x);
            // Ensure progress update includes loaded and total
            if (x.status === 'progress' && x.loaded && x.total) {
                self.postMessage({
                    status: 'progress',
                    progress: {
                        loaded: x.loaded,
                        total: x.total,
                        file: x.file || 'unknown'
                    }
                });
            } else if (x.status === 'initiate' || x.status === 'download') {
                self.postMessage({
                    status: 'progress',
                    progress: {
                        loaded: 0,
                        total: 100,
                        file: x.file || 'initializing'
                    }
                });
            }
        });

        self.postMessage({ status: 'loading', data: 'Compiling shaders and warming up model...' });
        const { tokenizer, model } = pipeline;
        const inputs = tokenizer('a');
        await model.generate({ ...inputs, max_new_tokens: 1 });
        console.log('Worker: Model loaded and warmed up');
        self.postMessage({ status: 'ready' });
    } catch (e) {
        console.error('Worker: Model loading failed:', e);
        // Check if error is related to offline access
        if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
            self.postMessage({ status: 'error', data: 'Offline: Model files not cached. Please connect to the internet to cache the model.' });
        } else {
            self.postMessage({ status: 'error', data: `Model loading failed: ${e.message || e.toString()}` });
        }
    }
}

self.addEventListener('message', async (e) => {
    console.log('Worker: Received message:', e.data);
    const { type, data } = e.data;
    switch (type) {
        case 'check':
            check();
            break;
        case 'load':
            load(data);
            break;
        case 'generate':
            generate(data);
            break;
        case 'interrupt':
            stopping_criteria.interrupt();
            break;
        case 'reset':
            past_key_values_cache = null;
            stopping_criteria.reset();
            break;
    }
});

self.onerror = (error) => {
    console.error('Worker: Unhandled error:', error);
    const errorDetails = error.message || error.toString() || 'Unknown worker error';
    self.postMessage({ status: 'error', data: `Worker crashed: ${errorDetails}` });
};

self.addEventListener('unhandledrejection', (event) => {
    console.error('Worker: Unhandled promise rejection:', event.reason);
    const errorDetails = event.reason?.message || event.reason?.toString() || 'Unknown promise error';
    self.postMessage({ status: 'error', data: `Unhandled promise rejection: ${errorDetails}` });
});