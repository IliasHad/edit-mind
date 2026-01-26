# Search Package

This package is responsible for implementing search functionalities, including both text-based and vector-based (semantic) search.

## Dependencies

This package has dependencies on the following libraries:

- `compute-cosine-similarity`: For calculating cosine similarity.
- `shared`: A workspace package providing shared utilities.
- `vector`: A workspace package providing vector database functionalities.

## Features

- **Hybrid Search Logic:** The `hybridSearch.ts` file defines the core logic for combining search results from different sources (image, text, and audio) into a single, ranked list.
  - **Weighted Scoring:** Uses weighted scoring to combine scores from different search types.
  - **Rank-Based Normalization:** Implements a rank-based scoring mechanism with exponential decay.
  - **Hybrid Boost:** Applies a boost factor to results appearing in multiple search types.
  - **Harmonic Mean:** Provides an alternative scoring strategy using the harmonic mean for balanced hybrid results.
- **Visual Search Logic:** The `visualSearch.ts` file implements visual search functionality.
  - **Image Embedding:** Generates image embeddings using the `@vector/services/embedding` package.
  - **Vector Database Query:** Uses embeddings to query a vector database (`@vector/services/vectorDb`) for similar scenes.
  - **Scene Reconstruction:** Reconstructs video objects with matched scenes and populates additional metadata.
  - **Confidence Threshold:** Filters out less relevant results based on a confidence score.
