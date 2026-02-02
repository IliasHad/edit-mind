# Embedding Core Package

This package is responsible for generating vector embeddings from text and interacting with a vector database (ChromaDB). It is crucial for semantic search and smart collection functionalities.

## Dependencies

This package has dependencies on the following libraries:

- `@xenova/transformers`: For leveraging pre-trained Hugging Face models for embedding generation.

## Features

- **Embedding Generation:** Provides functions to generate various types of embeddings:
  - **Text Embeddings:** Uses `Xenova/all-mpnet-base-v2` for general text embeddings.