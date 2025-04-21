<img src="assets/icon-512.png" alt="AI Assistant Banner" width="200" height="200">

# AI Assistant PWA

Try the app online: [AI Assistant PWA](https://assistant-one-nu.vercel.app/)

Welcome to the **AI Assistant PWA**, a Progressive Web App (PWA) powered by the Gemma 3 model (`gemma3-1b-it-int4.task`). This app delivers a versatile, installable, and fully offline-capable AI assistant that users can customize with different roles and settings. Designed for seamless local installation on desktops, tablets, and smartphones, the AI Assistant PWA offers a modern, intuitive interface for interactive conversations and task assistance, all running directly in the browser.

## Features

- **Progressive Web App (PWA)**:
  - Installable on devices (desktop, iOS, Android) for a native app-like experience.
  - Compatible with modern browsers (Chrome, Edge, Safari).
  - Responsive design for a seamless user experience across screen sizes.

- **Customizable Assistant Roles**:
  - Define the AI’s role via the system prompt (e.g., "You are a coding mentor" or "You are a travel planner").
  - Tailor the assistant’s tone, expertise, and responses to meet specific needs.

- **Adjustable Settings**:
  - Fine-tune AI behavior with configurable parameters:
    - **Temperature**: Control response creativity (0.0–1.0, default: 0.2).
    - **Top-K**: Adjust response diversity (1–100, default: 50).
  - Accessible through an intuitive settings modal.

- **Offline Capabilities**:
  - Fully offline operation after initial setup, thanks to PWA caching and a locally stored model.
  - Ideal for use in low or no-connectivity environments, with all processing done on-device.

- **Markdown Support**:
  - AI responses rendered in rich Markdown format, supporting lists, headers, code blocks, and more for clear, formatted output.

- **Modern User Interface**:
  - Clean, user-friendly design with a hamburger menu for settings access.
  - Smooth conversation history display, distinguishing user and assistant messages.

## Model Details

The AI Assistant PWA is powered by the `gemma3-1b-it-int4.task` model, a compact and efficient member of the Gemma 3 model family, optimized for on-device inference.

- **Model Name**: `gemma3-1b-it-int4.task`
- **Size**: 528.97 MB
- **Description**: A 1-billion parameter model with 4-bit integer quantization, designed for fast, memory-efficient text generation in web environments.
- **Source**: Downloaded from [Hugging Face](https://huggingface.co/litert-community/Gemma3-1B-IT/blob/main/gemma3-1b-it-int4.task) and stored locally in the `assets/` directory.
- **Technical Report**: Learn more about the Gemma 3 model family in the <a href="https://arxiv.org/abs/2503.19786" target="_blank">official technical report</a>.
- **Framework**: Integrated with MediaPipe’s `LlmInference` API for browser-based inference.

### Installation Prerequisites
- A modern web browser with PWA support (e.g., Chrome, Edge, Safari).
- Initial internet connection to cache the app and download the model (offline thereafter).
- **Hugging Face Access Token**: To access the model, you need a Hugging Face account and an access token. If you don’t have an account, sign up for free at [Hugging Face](https://huggingface.co/). Then, generate an access token from your [Hugging Face Settings](https://huggingface.co/settings/tokens) and enter it in the app’s settings modal to download and use the model for free.



### Repository
- **GitHub**: `https://github.com/VladimerKhasia/assistant.git` 
- **Files**:
  - `index.html`: Main HTML structure.
  - `index.js`: Core logic with MediaPipe integration.
  - `styles.css`: UI styling.
  - `service-worker.js`: PWA offline support.
  - `manifest.json`: PWA configuration.
  - `assets/`:
    - `gemma3-1b-it-int4.task`: Local 528.97 MB model file.
    - `icon-192.png`, `icon-512.png`: App icons.

### Local Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/VladimerKhasia/assistant.git
   cd assistant