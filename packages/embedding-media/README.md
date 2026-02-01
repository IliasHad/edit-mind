# Embedding Media Package

This package is responsible for generating vector embeddings from media data types (image, audio) and interacting with a vector database (ChromaDB). It is crucial for semantic search and smart collection functionalities.

## Dependencies

This package has dependencies on the following libraries:

- `@xenova/transformers`: For leveraging pre-trained Hugging Face models for embedding generation.

## Features

- **Embedding Generation:** Provides functions to generate various types of embeddings:
  - **Visual Embeddings:** Uses `Xenova/clip-vit-base-patch32` for image and text-to-visual embeddings.
  - **Audio Embeddings:** Uses `Xenova/clap-htsat-unfused` for audio and text-to-audio embeddings.