# Media Utils Package

This package provides utilities for processing and analyzing various media files, including video, audio, and images.

## Dependencies

This package has dependencies on several media-related libraries:

-   `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe`: For FFmpeg and FFprobe binaries.
-   `exiftool-vendored`: For extracting EXIF metadata from media files.
-   `gopro-telemetry` and `gpmf-extract`: For extracting telemetry data from GoPro videos.
-   `jimp`: For image processing.
-   `micromatch`: For matching file paths against glob patterns.

## Features

-   **FFmpeg and FFprobe Integration:** Provides functions to load the paths to the FFmpeg and FFprobe binaries, validate their existence and permissions, and spawn child processes to execute them.
-   **Binary Management:** Uses `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe` to manage the FFmpeg and FFprobe binaries, which simplifies their integration.
-   **Permissions:** Ensures that the binaries have the correct execute permissions.
-   **Image Processing:** The `Jimp` library is used for image manipulation.
