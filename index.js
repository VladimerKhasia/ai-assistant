import {FilesetResolver, LlmInference} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai';
import * as hub from 'https://cdn.jsdelivr.net/npm/@huggingface/hub@1.1.2/+esm';

const input = document.getElementById('input');
const output = document.getElementById('output');
const submit = document.getElementById('submit');
const systemPromptInput = document.getElementById('systemPrompt');
const temperatureInput = document.getElementById('temperature');
const topKInput = document.getElementById('topK');
const hfTokenInput = document.getElementById('hfToken');
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const saveSettings = document.getElementById('save-settings');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

let conversationHistory = []; // For model input (last 2 turns)
let uiConversationHistory = []; // For UI display (all turns)
let llmInference;
let currentSettings = {
    systemPrompt: systemPromptInput.value.trim(),
    temperature: parseFloat(temperatureInput.value) || 0.2,
    topK: parseInt(topKInput.value) || 50,
    hfToken: hfTokenInput.value.trim()
};

console.log('Initial settings:', currentSettings);

// Configure marked.js for better Markdown handling
marked.setOptions({
    breaks: true,
    gfm: true,
    mangle: false,
    headerIds: false
});

/**
 * Register service worker for PWA
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

/**
 * Get model asset path by downloading from Hugging Face with progress tracking
 */
async function getModelAssetPath() {
    if (!currentSettings.hfToken) {
        throw new Error('Hugging Face access token is required. Please enter a valid token in settings.');
    }
    const repo = { type: "model", name: "litert-community/Gemma3-1B-IT" };
    const filePath = "gemma3-1b-it-int4.task";
    try {
        console.log('Attempting to download model with token:', currentSettings.hfToken.slice(0, 10) + '...');
        const response = await hub.downloadFile({ repo, path: filePath, accessToken: currentSettings.hfToken });
        console.log('Download response status:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`Failed to download model from Hugging Face: ${response.status} ${response.statusText}`);
        }

        // Show progress bar in modal
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Loading model: 0%';

        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
            console.warn('Content-Length header not available, progress bar may not be accurate.');
        }
        const total = contentLength ? parseInt(contentLength, 10) : null;
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            if (total) {
                const percent = Math.min((loaded / total) * 100, 100).toFixed(1);
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `Loading model: ${percent}%`;
            }
        }

        const modelArrayBuffer = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
            modelArrayBuffer.set(chunk, offset);
            offset += chunk.length;
        }

        const modelBlob = new Blob([modelArrayBuffer], { type: 'application/octet-stream' });
        return URL.createObjectURL(modelBlob);
    } catch (error) {
        console.error('Model download error:', error);
        progressContainer.style.display = 'none';
        throw new Error(`Failed to download model from Hugging Face: ${error.message}`);
    }
}

/**
 * Initialize the model with provided settings
 */
async function initializeModel() {
    try {
        submit.textContent = 'Loading the model...';
        submit.disabled = true;
        const genaiFileset = await FilesetResolver.forGenAiTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm'
        );
        const modelAssetPath = await getModelAssetPath();
        const response = await fetch(modelAssetPath);
        if (!response.ok) {
            throw new Error(`Model file not accessible: ${response.status} ${response.statusText}`);
        }
        llmInference = await LlmInference.createFromOptions(genaiFileset, {
            baseOptions: {modelAssetPath: modelAssetPath},
            maxTokens: 2048,
            randomSeed: 1,
            topK: currentSettings.topK,
            temperature: currentSettings.temperature
        });
        progressContainer.style.display = 'none';
        submit.disabled = false;
        submit.textContent = 'Get Response';
        output.innerHTML = '<div class="info-message">Model loaded successfully. Enter a query to get started.</div>';
    } catch (error) {
        progressContainer.style.display = 'none';
        console.error('Model initialization failed:', error);
        alert(`Failed to load model: ${error.message}. Please ensure a valid Hugging Face token is provided and you have accepted the model terms.`);
        submit.textContent = 'Model Load Failed';
        submit.disabled = true;
        output.innerHTML = `<div class="error-message">Unable to load model: ${error.message}</div>`;
        throw error;
    }
}

/**
 * Render the full UI conversation history as HTML with Markdown
 */
function renderConversation() {
    output.innerHTML = '';
    uiConversationHistory.forEach(turn => {
        const div = document.createElement('div');
        div.className = turn.type === 'user' ? 'user-message' : 'model-message';
        const prefix = turn.type === 'user' ? 'You: ' : 'Assistant: ';
        let content;
        if (turn.type === 'user') {
            content = turn.content;
        } else {
            try {
                content = marked.parse(turn.content);
            } catch (error) {
                console.warn('Markdown parsing failed for partial result:', turn.content, error);
                content = turn.content;
            }
        }
        div.innerHTML = `<strong>${prefix}</strong>${content}`;
        output.appendChild(div);
    });
    output.scrollTop = output.scrollHeight;
}

/**
 * Display newly generated partial results to the output div
 */
function displayPartialResults(partialResults, complete) {
    console.log('Raw partial result:', partialResults);
    const cleanPartial = partialResults.replace(/<end_of_turn>/g, '');
    if (cleanPartial) {
        if (uiConversationHistory.length > 0 && uiConversationHistory[uiConversationHistory.length - 1].type === 'model') {
            uiConversationHistory[uiConversationHistory.length - 1].content += cleanPartial;
            uiConversationHistory[uiConversationHistory.length - 1].complete = complete;
        } else {
            uiConversationHistory.push({ type: 'model', content: cleanPartial, complete: complete });
        }
        renderConversation();
    }

    if (complete) {
        const finalResponse = uiConversationHistory[uiConversationHistory.length - 1]?.content || 'No response generated. Please try again.';
        uiConversationHistory[uiConversationHistory.length - 1].content = finalResponse;
        uiConversationHistory[uiConversationHistory.length - 1].complete = true;

        console.log('Final model response Markdown:', finalResponse);
        try {
            console.log('Final parsed HTML:', marked.parse(finalResponse));
        } catch (error) {
            console.warn('Final Markdown parsing failed:', error);
        }

        const responseWithEnd = finalResponse + (partialResults.includes('<end_of_turn>') ? '' : '<end_of_turn>');
        conversationHistory = [
            conversationHistory[conversationHistory.length - 1],
            { type: 'model', content: responseWithEnd }
        ].filter(Boolean);

        renderConversation();
        submit.disabled = false;
        submit.textContent = 'Get Response';
    }
}

/**
 * Modal handling functions
 */
function openModal() {
    settingsModal.style.display = 'block';
}

function closeModalFunc() {
    settingsModal.style.display = 'none';
}

/**
 * Validate and save settings, reusing model if possible
 */
async function saveSettingsFunc() {
    console.log('Save Settings button clicked');
    const newSystemPrompt = systemPromptInput.value.trim() || 'You are a helpful assistant.';
    const newTemperature = parseFloat(temperatureInput.value);
    const newTopK = parseInt(topKInput.value);
    const newHfToken = hfTokenInput.value.trim();

    if (isNaN(newTemperature) || newTemperature < 0 || newTemperature > 1) {
        alert('Temperature must be between 0.0 and 1.0.');
        return;
    }
    if (isNaN(newTopK) || newTopK < 1 || newTopK > 100) {
        alert('Top-K must be between 1 and 100.');
        return;
    }

    saveSettings.disabled = true;
    saveSettings.textContent = 'Saving...';
    submit.disabled = true;
    submit.textContent = 'Processing...';

    const requiresModelReload = (
        newTemperature !== currentSettings.temperature ||
        newTopK !== currentSettings.topK ||
        newHfToken !== currentSettings.hfToken ||
        !llmInference
    );

    console.log('Settings comparison:', {
        newTemperature, oldTemperature: currentSettings.temperature,
        newTopK, oldTopK: currentSettings.topK,
        newHfToken: newHfToken.slice(0, 10) + '...', oldHfToken: currentSettings.hfToken.slice(0, 10) + '...',
        llmInferenceExists: !!llmInference,
        requiresModelReload
    });

    currentSettings = {
        systemPrompt: newSystemPrompt,
        temperature: newTemperature,
        topK: newTopK,
        hfToken: newHfToken
    };
    console.log('New settings applied:', currentSettings);

    try {
        // Always clear history
        conversationHistory = [];
        uiConversationHistory = [];
        output.innerHTML = '';

        if (requiresModelReload) {
            console.log('Model reload required due to changes in token, temperature, topK, or no model loaded.');
            submit.textContent = 'Loading model...';
            llmInference = null;
            await initializeModel();
            alert('Settings updated and model loaded successfully.');
        } else {
            console.log('Reusing existing model with new system prompt.');
            submit.disabled = false;
            submit.textContent = 'Get Response';
            output.innerHTML = '<div class="info-message">System prompt updated. Enter a query to get started.</div>';
            alert('System prompt and history updated without reloading the model.');
        }
    } catch (error) {
        console.error('Failed to initialize model:', error);
        output.innerHTML = `<div class="error-message">Failed to load model: ${error.message}. Please check your Hugging Face token and internet connection.</div>`;
        submit.textContent = 'Model Load Failed';
        submit.disabled = true;
        saveSettings.disabled = false;
        saveSettings.textContent = 'Save Settings';
        return;
    }

    saveSettings.disabled = false;
    saveSettings.textContent = 'Save Settings';
    closeModalFunc();
}

/**
 * Initialize UI and event listeners without loading model
 */
function initializeApp() {
    settingsToggle.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalFunc);
    if (!saveSettings) {
        console.error('Save Settings button not found in DOM');
        alert('Error: Save Settings button is missing. Please check the HTML.');
        return;
    }
    saveSettings.addEventListener('click', saveSettingsFunc);
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeModalFunc();
        }
    });

    submit.onclick = async () => {
        const userInput = input.value.trim();
        input.value = '';
        if (!userInput) {
            output.innerHTML = '<div class="error-message">Please enter a query.</div>';
            input.focus();
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Generating...';

        conversationHistory.push({ type: 'user', content: userInput });
        uiConversationHistory.push({ type: 'user', content: userInput, complete: true });

        if (conversationHistory.length > 2) {
            conversationHistory = conversationHistory.slice(-2);
        }

        renderConversation();

        let promptParts = [];
        promptParts.push(`[BOS]<start_of_turn>user\n${currentSettings.systemPrompt}\n${userInput}\n<end_of_turn>`);
        promptParts.push('<start_of_turn>model');
        const fullPrompt = promptParts.join('\n');
        console.log('Full prompt sent to model:', fullPrompt);

        try {
            if (!llmInference) {
                throw new Error('Model not initialized. Please save settings with a valid token.');
            }
            await llmInference.generateResponse(fullPrompt, displayPartialResults);
        } catch (error) {
            console.error('Response generation failed:', error);
            uiConversationHistory.push({ type: 'model', content: `Error generating response: ${error.message}. Please try again.`, complete: true });
            renderConversation();
            submit.disabled = false;
            submit.textContent = 'Get Response';
        }
    };

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            if (!submit.disabled) {
                console.log('Enter key pressed, triggering submit');
                submit.click();
            } else {
                console.log('Enter key ignored: submit button is disabled');
            }
        }
    });

    // Initial UI state
    submit.disabled = true;
    submit.textContent = 'Configure Settings';
    output.innerHTML = '<div class="info-message">Please open settings and provide a Hugging Face access token to load the model.</div>';
}

// Start the app
initializeApp();