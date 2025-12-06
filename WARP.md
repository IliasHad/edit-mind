# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# Project Structure

This is a monorepo managed by **pnpm**.

- **apps/**
  - `web`: React/Vite application (Frontend).
  - `desktop`: Electron application (Desktop Client).
  - `background-jobs`: Node.js service (Express, BullMQ) that orchestrates video processing and communicates with the Python service.
- **packages/**
  - `prisma`: Database schema, migrations, and client generation.
  - `shared`: Shared utilities, types, constants, and services (including `pythonService`).
  - `ui`: Shared UI component library.
- **python/**: Python service for AI/ML tasks (Video Analysis, Transcription, Face Recognition).
- **docker/**: Docker Compose configuration and Dockerfiles.

# Development Setup

## Prerequisites
- Node.js (v22+)
- pnpm (v10+)
- Python (3.11+)
- Docker & Docker Compose (Recommended for running services like Postgres, Redis, ChromaDB)

## Initial Setup
1.  Install dependencies:
    ```bash
    pnpm install
    ```
2.  Set up environment variables:
    - Copy `.env.example` to `.env` in the root.
    - Configure `HOST_MEDIA_PATH`, `GEMINI_API_KEY` (if used), etc.
3.  Start infrastructure services (Postgres, Redis, ChromaDB):
    ```bash
    docker compose -f docker/docker-compose.yml up -d postgres redis chroma
    ```
4.  Initialize Database:
    ```bash
    pnpm prisma generate
    pnpm prisma migrate dev
    pnpm prisma seed
    ```

## Python Environment (Local Development)
If running `background-jobs` locally (not in Docker), you must set up the Python environment:

1.  Create a virtual environment in `python/venv` (or similar):
    ```bash
    cd python
    python -m venv venv
    # Activate venv (Windows: venv\Scripts\activate, Unix: source venv/bin/activate)
    pip install -r requirements.txt
    cd ..
    ```
2.  Update `.env` to point to the local Python setup:
    ```ini
    PYTHON_SCRIPT="./python/analysis_service.py"
    VENV_PATH="./python/venv"
    PYTHON_PORT="8765"
    ```

# Common Commands

## Running Applications
- **Web App**:
    ```bash
    pnpm --filter web dev
    ```
- **Desktop App**:
    ```bash
    pnpm --filter desktop dev
    ```
- **Background Jobs**:
    ```bash
    pnpm --filter background-jobs dev
    ```

## Database Management (via `packages/prisma`)
- Generate Client: `pnpm prisma generate`
- Run Migrations: `pnpm prisma migrate dev`
- Seed Database: `pnpm prisma seed`
- Open Studio: `pnpm prisma studio`

## Testing
- Run all tests:
    ```bash
    pnpm test
    ```
- Run specific package tests:
    ```bash
    pnpm --filter web test
    pnpm --filter desktop test
    pnpm --filter shared test
    ```

## Linting & Formatting
- Lint: `pnpm --filter <package> lint`
- Format: `pnpm --filter <package> format` (or `prettier --write .`)

# Architecture & Key Components

## Video Processing Pipeline
1.  **Ingestion**: `background-jobs` watches `HOST_MEDIA_PATH` or receives upload events.
2.  **Queue**: BullMQ manages processing jobs (`video-indexing`).
3.  **Orchestration**: `videoIndexer.ts` in `background-jobs` coordinates the workflow.
4.  **Analysis**: `pythonService` (in `packages/shared`) spawns the Python process and communicates via **WebSockets** (`ws://localhost:8765`).
    - **Transcription**: OpenAI Whisper.
    - **Vision**: OpenCV, YOLO, Gemini (optional).
    - **Embeddings**: Stored in ChromaDB for semantic search.

## Communication
- **Node <-> Python**: WebSocket connection. The Node.js service manages the Python process lifecycle (spawn/kill).
- **Frontend <-> Backend**: REST API (Express) and likely WebSockets or Polling for job status.

## Database
- **Postgres**: Stores metadata, video info, jobs, scenes, and faces. Managed by Prisma.
- **ChromaDB**: Vector database for semantic search embeddings.
- **Redis**: Backend for BullMQ job queues.
