# Vector Package

This package is responsible for generating vector embeddings from various data types (text, image, audio) and interacting with a vector database (ChromaDB). It is crucial for semantic search and smart collection functionalities.

## Dependencies

This package has dependencies on the following libraries:

- `chromadb`: For interacting with the ChromaDB vector database.
- `@xenova/transformers`: For leveraging pre-trained Hugging Face models for embedding generation.

## Features

- **Embedding Generation:** Provides functions to generate various types of embeddings:
  - **Text Embeddings:** Uses `Xenova/all-mpnet-base-v2` for general text embeddings.
  - **Visual Embeddings:** Uses `Xenova/clip-vit-base-patch32` for image and text-to-visual embeddings.
  - **Audio Embeddings:** Uses `Xenova/clap-htsat-unfused` for audio and text-to-audio embeddings.
- **Model Caching:** Employs in-memory caching of models (`visualModelCache`, `textModelCache`, etc.) to enhance performance by avoiding redundant loading.
- **Normalization:** All generated embeddings are normalized to unit vectors, which is a standard practice for accurate similarity comparisons.
- **Vector Database Interaction:** Integrates with ChromaDB for efficient storage and retrieval of vector embeddings, enabling semantic search and similarity queries.