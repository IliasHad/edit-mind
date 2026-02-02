# Vector Package

This package is responsible for generating vector embeddings from various data types (text, image, audio) and interacting with a vector database (ChromaDB). It is crucial for semantic search and smart collection functionalities.

## Dependencies

This package has dependencies on the following libraries:

- `chromadb`: For interacting with the ChromaDB vector database.

## Features

- **Model Caching:** Employs in-memory caching of models (`visualModelCache`, `textModelCache`, etc.) to enhance performance by avoiding redundant loading.
- **Normalization:** All generated embeddings are normalized to unit vectors, which is a standard practice for accurate similarity comparisons.
- **Vector Database Interaction:** Integrates with ChromaDB for efficient storage and retrieval of vector embeddings, enabling semantic search and similarity queries.