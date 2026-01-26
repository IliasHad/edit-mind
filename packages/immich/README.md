# Immich Package

This package provides a service for importing faces from an [Immich](https://immich.app/) instance.

## Features

- **Immich Client:** The `ImmichClient` class provides a convenient way to interact with the Immich API. It includes methods for fetching people, time buckets, assets, and faces.
- **Face Extraction:** the `ImmichClient` to fetch all the people and their faces from an Immich instance. It then extracts the faces from the images and saves them to the local file system.
- **Image Processing:** The `Jimp` library is used for image processing, specifically for cropping the faces from the images.
