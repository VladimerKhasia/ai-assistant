<img src="assets/icon-512.png" alt="AI Assistant Banner" width="200" height="200">

# AI Assistant PWA

Try the app online: [AI Assistant PWA](https://assistant-tau-rouge.vercel.app/)

Welcome to the **AI Assistant PWA**, a Progressive Web App (PWA) powered by the SmolLM2 model (`HuggingFaceTB/SmolLM2-1.7B-Instruct`). This app delivers a versatile, installable, and fully offline-capable AI assistant that users can customize with different roles and settings. Designed for seamless local installation on desktops, tablets, and smartphones, the AI Assistant PWA offers a modern, intuitive interface for interactive conversations and task assistance, all running directly in the browser.

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
- **Model Name**: `HuggingFaceTB/SmolLM2-1.7B-Instruct`
- **Description**: A 1.7-billion parameter model.
- **Source**: Downloaded from [Hugging Face](https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct).

### Installation Prerequisites
- A modern web browser with PWA support (e.g., Chrome, Edge, Safari).
- WebGPU enabled, typically default in modern browsers.
- Initial internet connection to cache the app and download the model (offline thereafter).

### Repository
- **GitHub**: `https://github.com/VladimerKhasia/assistant.git` 
- **Files**:
  - `index.html`
  - `index.js`
  - `styles.css`
  - `service-worker.js`
  - `worker.js`
  - `manifest.json`
  - `assets/`
    - `icon-192.png`, `icon-512.png`

### Local Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/VladimerKhasia/assistant.git
   cd assistant