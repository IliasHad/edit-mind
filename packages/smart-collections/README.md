# Smart Collections Package

This package is responsible for generating and managing "smart collections" of videos based on various criteria, leveraging AI insights and vector similarity.

## Features

- **Smart Collection Generation:** The core logic is in `src/services/collection.ts`, which processes scenes in batches, calculates scores based on various criteria (visual, audio, text embeddings, and metadata filters), and then groups them into collections.
- **Embedding-Based Matching:** Leverages visual, audio, and text embeddings (generated via the `vector` package) to find scenes that semantically match predefined collection definitions.
- **Batch Processing:** Processes scenes in batches to efficiently manage memory usage and improve performance for large datasets.
- **Filtering and Scoring:** Applies metadata filters and calculates a `finalScore` for each scene to determine its relevance to a collection, ensuring high accuracy in collection grouping.
