import {FilesetResolver, LlmInference} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai';

const input = document.getElementById('input');
const output = document.getElementById('output');
const submit = document.getElementById('submit');
const systemPromptInput = document.getElementById('systemPrompt');
const temperatureInput = document.getElementById('temperature');
const topKInput = document.getElementById('topK');
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const saveSettings = document.getElementById('save-settings');

const modelFileName = './assets/gemma3-1b-it-int4.task';

let conversationHistory = [];
let uiConversationHistory = [];
let llmInference;
let currentSettings = {
    systemPrompt: systemPromptInput.value.trim(),
    temperature: parseFloat(temperatureInput.value) || 0.2,
    topK: parseInt(topKInput.value) || 50
};

console.log('Initial settings:', currentSettings);

marked.setOptions({
    breaks: true,
    gfm: true,
    mangle: false,
    headerIds: false
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

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
    }
}

function openModal() {
    settingsModal.style.display = 'block';
}

function closeModalFunc() {
    settingsModal.style.display = 'none';
}

async function saveSettingsFunc() {
    console.log('Save Settings button clicked');
    const newSystemPrompt = systemPromptInput.value.trim() || 'You are a helpful assistant.';
    const newTemperature = parseFloat(temperatureInput.value);
    const newTopK = parseInt(topKInput.value);

    if (isNaN(newTemperature) || newTemperature < 0 || newTemperature > 1) {
        alert('Temperature must be between 0.0 and 1.0.');
        return;
    }
    if (isNaN(newTopK) || newTopK < 1 || newTopK > 100) {
        alert('Top-K must be between 1 and 100.');
        return;
    }

    const settingsChanged = (
        newSystemPrompt !== currentSettings.systemPrompt ||
        newTemperature !== currentSettings.temperature ||
        newTopK !== currentSettings.topK
    );

    saveSettings.disabled = true;
    saveSettings.textContent = 'Saving...';
    submit.textContent = 'Reloading model...';
    submit.disabled = true;

    if (settingsChanged) {
        currentSettings = {
            systemPrompt: newSystemPrompt,
            temperature: newTemperature,
            topK: newTopK
        };
        console.log('New settings applied:', currentSettings);

        try {
            llmInference = null;
            const genaiFileset = await FilesetResolver.forGenAiTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm'
            );
            llmInference = await LlmInference.createFromOptions(genaiFileset, {
                baseOptions: { modelAssetPath: modelFileName },
                maxTokens: 2048,
                randomSeed: 1,
                topK: newTopK,
                temperature: newTemperature
            });
            conversationHistory = [];
            uiConversationHistory = [];
            output.innerHTML = '';
            console.log('Model reloaded successfully with new system prompt:', newSystemPrompt);
            alert('Settings updated, model reloaded, and conversation history reset.');
        } catch (error) {
            console.error('Failed to reinitialize model:', error);
            output.innerHTML = '<div class="error-message">Failed to reload model. Please check your internet connection and try again.</div>';
            submit.textContent = 'Model Reload Failed';
            saveSettings.disabled = false;
            saveSettings.textContent = 'Save Settings';
            return;
        }
    } else {
        console.log('No settings changed, skipping model reload');
        alert('No changes detected in settings.');
    }

    saveSettings.disabled = false;
    saveSettings.textContent = 'Save Settings';
    submit.textContent = 'Get Response';
    submit.disabled = false;

    closeModalFunc();
}

async function loadModel(genaiFileset) {
    try {
        submit.textContent = 'Loading the model...';
        console.log('Attempting to fetch model file:', modelFileName);
        const response = await fetch(modelFileName, { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`Failed to fetch model at ${modelFileName}: ${response.statusText}`);
        }
        console.log('Model file fetched successfully, size:', response.headers.get('content-length'), 'bytes');

        llmInference = await LlmInference.createFromOptions(genaiFileset, {
            baseOptions: { modelAssetPath: modelFileName },
            maxTokens: 2048,
            randomSeed: 1,
            topK: currentSettings.topK,
            temperature: currentSettings.temperature
        });
        console.log('Model initialized successfully');
        submit.disabled = false;
        submit.textContent = 'Get Response';
    } catch (error) {
        console.error('Model loading failed:', error);
        alert(`Failed to initialize the model: ${error.message}. Please check your internet connection and ensure the model file is accessible.`);
        submit.textContent = 'Model Load Failed';
        output.innerHTML = `<div class="error-message">Unable to initialize model: ${error.message}. Please check your internet connection.</div>`;
        throw error;
    }
}

async function runDemo() {
    try {
        const genaiFileset = await FilesetResolver.forGenAiTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm'
        );

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

        const installPopup = document.getElementById('install-popup');
        const installTrigger = document.getElementById('install-trigger');
        const closePopup = document.getElementById('close-popup');
        const installComponent = document.getElementById('installComponent');
        const installNote = document.getElementById('installNote');
        let deferredPrompt;

        setTimeout(() => {
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                installPopup.style.display = 'flex';
            }
        }, 3000);

        if (installTrigger) {
            installTrigger.addEventListener('click', () => {
                installPopup.style.display = 'flex';
            });
        }

        closePopup.addEventListener('click', () => {
            installPopup.style.display = 'none';
        });

        installPopup.addEventListener('click', (event) => {
            if (event.target === installPopup) {
                installPopup.style.display = 'none';
            }
        });

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('beforeinstallprompt event captured');
            installComponent.style.display = 'block';
        });

        installComponent.addEventListener('click', async () => {
            if (deferredPrompt) {
                try {
                    await deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('User response to install prompt:', outcome);
                    if (outcome === 'accepted') {
                        console.log('PWA installation accepted');
                        installPopup.style.display = 'none';
                    }
                    deferredPrompt = null;
                } catch (error) {
                    console.error('Install prompt failed:', error);
                }
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed successfully');
            installPopup.style.display = 'none';
            installTrigger.style.display = 'none';
        });

        if (!('BeforeInstallPromptEvent' in window)) {
            installNote.style.display = 'block';
        }

        submit.onclick = async () => {
            const userInput = input.value.trim();
            input.value = '';
            if (!userInput) {
                output.innerHTML = '<div class="error-message">Please enter a query.</div>';
                input.focus();
                return;
            }

            submit.disabled = true;

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
                    throw new Error('Model not initialized.');
                }
                await llmInference.generateResponse(fullPrompt, displayPartialResults);
            } catch (error) {
                console.error('Response generation failed:', error);
                uiConversationHistory.push({ type: 'model', content: 'Error generating response. Please check your internet connection or try again.', complete: true });
                renderConversation();
                submit.disabled = false;
            }
        };

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                if (!submit.disabled) {
                    submit.click();
                }
            }
        });

        await loadModel(genaiFileset);
    } catch (error) {
        console.error('Initialization failed:', error);
        alert(`Failed to initialize the app: ${error.message}. Please refresh and try again.`);
        submit.textContent = 'App Load Failed';
        output.innerHTML = `<div class="error-message">Unable to initialize app: ${error.message}. Please refresh and try again.</div>`;
    }
}

runDemo();