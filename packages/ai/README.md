# AI Package

This package is a service for interacting with various AI models, providing a unified interface for the rest of the application.

## AI Models

This package has dependencies on the following AI models:

- `@google/genai` for Google's generative AI models
- `ollama` for interacting with the Ollama service

## Features

- **Model Routing:** The `modelRouter.ts` file implements a model router that selects the active AI model based on environment variables. It supports Ollama, local LLaMA models, and Google Gemini.
- **Unified Interface:** It provides a unified interface for interacting with the different AI models, with functions for generating actions, assistant messages, and other responses.
