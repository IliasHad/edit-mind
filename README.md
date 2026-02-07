### Edit Mind:  Local Video Indexer & AI Search

Edit Mind lets you index your videos **(including transcription, frame analysis, and multi-model embedding)**, and you can search your videos (or specific video scenes) using natural language.

> **Development Status:** Edit Mind is currently in **active development** and **work in progress** and **not yet production-ready**.
> Expect incomplete features and occasional bugs. We welcome contributors to help us reach **v1.0**!


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-purple.svg)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Containerized-Docker-blue.svg)](https://www.docker.com/)


---
Note: (Edit Mind name is coming from Video Editor Mind, so this will be editor's second brain in the future)

## Sponsors of this project 

[![brycedev](https://img.shields.io/badge/Sponosor-brycedev-blue?logo=github)](https://github.com/brycedev)

## Showcase Video

[![Edit Mind Demo](https://img.youtube.com/vi/YrVaJ33qmtg/maxresdefault.jpg)](https://www.youtube.com/watch?v=YrVaJ33qmtg)  
*Click to watch a walkthrough of Edit Mind's core features.*

---

## Why Edit Mind?
- Search videos by spoken words, objects, faces, etc...
- Runs fully **locally**, respecting privacy.
- Works on **any computer or server with Docker installed**.
- Uses AI for rich metadata extraction and semantic search.

## Core Features

*   **Video Indexing and Processing:** A background service watches for new video files and queues them for AI-powered analysis.
*   **AI-Powered Video Analysis:** Extracts metadata like face recognition, transcription, object & text detection, scene analysis, and more.
*   **Vector-Based Semantic Search:** Powerful natural language search capabilities on video content using ChromaDB.
*   **Dual Interfaces:** Access your video library through a **Web App**.

---


### Core Technologies

| Area | Technology |
| :---------------- | :------------------------------------------------ |
| **Monorepo**      | [pnpm workspaces](https://pnpm.io/workspaces)   |
| **Containerization** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |
| **Web Service**      | [React Router V7](https://reactrouter.com/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Background Jobs Service** | [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [BullMQ](https://bullmq.io/) |
| **ML Sevice**       | [Python](https://www.python.org/), [OpenCV](https://opencv.org/), [PyTorch](https://pytorch.org/), OpenAI Whisper, Google Gemini or Ollama (Used for NLP) |
| **Vector Database** | [ChromaDB](https://www.trychroma.com/)           |
| **Relational DB** | [PostgreSQL](https://www.postgresql.org/) (via [Prisma ORM](https://www.prisma.io/)) |

---

## Getting Started

Edit Mind uses Docker Compose to run everything in containers.

## Setup Video

[![Edit Setup Guide](https://img.youtube.com/vi/WVNuP8ic3uY/maxresdefault.jpg)](https://www.youtube.com/watch?v=WVNuP8ic3uY)  
*Click to watch a walkthrough of Edit Mind's setup guide.*

### Prerequisites

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
*   That's it! Everything else runs in containers.

### 1. Project Setup
```bash
mkdir edit-mind
cd edit-mind
```

### 2. Configure Docker File Sharing

**Important:** Before proceeding, configure Docker to access your media folder.

**macOS/Windows:**
1. Open Docker Desktop
2. Go to **Settings** → **Resources** → **File Sharing**
3. Add the path where your videos are stored (e.g., `/Users/yourusername/Videos`)
4. Click **Apply & Restart**

**Linux:** File sharing is typically enabled by default.

### 3. Configure Environment Variables

Edit Mind uses a **two-file environment configuration**:
- **`.env`** - Your personal configuration (required)
- **`.env.system`** - System defaults (required)

#### Step 3.1: Create Your Personal Configuration

Copy the example file and customize it:

```bash
curl -L https://raw.githubusercontent.com/IliasHad/edit-mind/refs/heads/main/.env.example -o .env
curl -L https://raw.githubusercontent.com/IliasHad/edit-mind/refs/heads/main/.env.system.example -o .env.system
curl -L https://raw.githubusercontent.com/IliasHad/edit-mind/refs/heads/main/docker-compose.yml -o docker-compose.yml
 ```

If you have NVIDIA GPU, use `docker-compose.cuda.yml` file instead

```bash
curl -L https://raw.githubusercontent.com/IliasHad/edit-mind/refs/heads/main/docker-compose.cuda.yml -o docker-compose.yml
 ```

**Edit the `.env` file and configure these critical settings:**
```ini
# 1. SET YOUR VIDEO FOLDER PATH (REQUIRED)
# Must match the path you added to Docker File Sharing
HOST_MEDIA_PATH="/Users/yourusername/Videos"

# 2. CHOOSE AI MODEL (Pick one option)
# Option A: Use Ollama (more private, requires model download)
USE_OLLAMA_MODEL="TRUE"
OLLAMA_HOST="http://host.docker.internal"
OLLAMA_PORT="11434"
OLLAMA_MODEL="qwen2.5:7b-instruct"

# Please make sure to run ollama server first using this command 

# OLLAMA_HOST=0.0.0.0:11434 ollama serve
# and pull the ollama model first 
# ollama pull qwen2.5:7b-instruct

# Option B: Use Local Model (more private, requires model download)
# USE_LOCAL_MODEL="true"
# SEARCH_AI_MODEL="/app/models/path/to/.gguf"
# The AI model should be downloaded and saved it to models folder in the project root dir

# Option C: Use Gemini API (requires API key)
USE_LOCAL_MODEL="false"
GEMINI_API_KEY="your-gemini-api-key-from-google-ai-studio"

# 3. GENERATE SECURITY KEYS (REQUIRED)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY="your-random-32-char-base64-key"
# Generate with: openssl rand -hex 32
SESSION_SECRET="your-random-session-secret"
```

**Quick Key Generation:**
```bash
# Generate ENCRYPTION_KEY
openssl rand -base64 32

# Generate SESSION_SECRET
openssl rand -hex 32
```


### 4. Start the Services

Start all services with a single command:

```bash
docker compose up
```


### 5. Access the Applications

Once all services are running (look for "ready" messages in logs):

* **Web App:** [http://localhost:3745](http://localhost:3745)

If you're using Safari, use [http://127.0.0.1:3745](http://127.0.0.1:3745)

### 6. Add Your First Videos

1. Navigate to the web app at `http://localhost:3745`
2. Login using `admin@example.com` and the password is `admin`
3. Navigate to the web app at `http://localhost:3745/app/settings`
4. Click **"Add Folder"**
3. Select a folder from your `HOST_MEDIA_PATH` location
4. Navigate to the folder details page and click on `Rescan`
4. The background job service will automatically start processing your videos and will start watching for new video file events 

### Special Thanks

A huge thank you to the `r/selfhosted` community on Reddit for their amazing support, valuable feedback, and encouragement.

Original discussion:
https://www.reddit.com/r/selfhosted/comments/1ogis3j/i_built_a_selfhosted_alternative_to_googles_video/


## Contributing

We welcome contributions of all kinds! Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## Development Setup

Follow the steps below if you want to extend the app functionality or fix bugs.

### 1. Clone the Repository
```bash
git clone https://github.com/iliashad/edit-mind
cd edit-mind
```

### 2. Setup dev environment
```bash
cp .env.system.example docker/.env.system
cp .env.example docker/.env.dev
```

### 3. Start docker container in dev mode
```bash
pnpm install
cd docker 
docker-compose -f docker-compose.dev.yml up --build
```

## Community Presentations

[![Edit Mind at Twelve Labs](https://img.youtube.com/vi/k_aesDa3sFw/maxresdefault.jpg)](https://www.youtube.com/watch?v=k_aesDa3sFw&t=1272s)  
*Watch the Edit Mind presentation at Twelve Labs (starts at 21:12)*

---
<!--START_SECTION:buy-me-a-coffee-->
<!--END_SECTION:buy-me-a-coffe-->

---
## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.
