### 🧠 Edit Mind:  AI-Powered Video Indexing & Search

Edit Mind lets you **search your videos by content, not just filenames**. Recognize faces, transcribe speech, detect objects, and explore your library with natural language search. All **locally and securely**.  

Perfect for creators, editors, and researchers who need smarter video management.


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-purple.svg)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Containerized-Docker-blue.svg)](https://www.docker.com/)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-ffdd00?style=flat-square&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/iliashaddad_dev)

> ⚠️ **Development Status:** Edit Mind is currently in **active development** and **not yet production-ready**.
> Expect incomplete features and occasional bugs. We welcome contributors to help us reach **v1.0**!

---

## 📺 Demo

### YouTube Walkthrough
[![Edit Mind Demo](https://img.youtube.com/vi/YrVaJ33qmtg/maxresdefault.jpg)](https://www.youtube.com/watch?v=YrVaJ33qmtg)  
*Click to watch a walkthrough of Edit Mind's core features.*

---

## ⚡ Why Edit Mind?
- Search videos by spoken words, objects, faces, and events.
- Runs fully **locally**, respecting privacy.
- Works on **desktop and web**.
- Uses AI for rich metadata extraction and semantic search.


## ✨ Core Features

*   **Video Indexing and Processing:** A background service watches for new video files and queues them for AI-powered analysis.
*   **AI-Powered Video Analysis:** Extracts metadata like face recognition, transcription, object & text detection, scene analysis, and more.
*   **Vector-Based Semantic Search:** Powerful natural language search capabilities on video content using ChromaDB and Google Gemini.
*   **Dual Interfaces:** Access your video library through a native **Desktop App** (Electron) or a **Web App** (Docker).

---

## ⚙️ Monorepo Architecture & Tech Stack

This project is structured as a `pnpm` monorepo, separating concerns into distinct applications and shared packages.

### Applications

*   **`apps/desktop`**: The native Electron application, providing a rich user experience.
*   **`apps/web`**: A full-stack web application for browser-based access.
*   **`apps/background-jobs`**: The core backend service managing video processing, AI analysis orchestration, and job queues. (Used for the Docker setup)

### Shared Packages

*   **`packages/prisma`**: Database schema and migration management.
*   **`packages/shared`**: (Under refactoring) Contains utilities, types, and services shared across applications.
*   **`packages/ui`**: A shared UI component library (Under construction to share components between web and the desktop application).

### AI/ML Services

*   **`python/`**: Contains Python scripts for various AI-powered video analysis plugins, transcription, face matching and face reindexing. It's communicating via WebSockets.

### Core Technologies

| Area | Technology |
| :---------------- | :------------------------------------------------ |
| **Monorepo**      | [pnpm workspaces](https://pnpm.io/workspaces)   |
| **Containerization** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |
| **Frontend**      | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **UI / Styling**  | [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend (Node.js)** | [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [BullMQ](https://bullmq.io/) |
| **AI / ML**       | [Python](https://www.python.org/), [OpenCV](https://opencv.org/), [PyTorch](https://pytorch.org/), OpenAI Whisper, Google Gemini (Used for NLP) |
| **Vector Database** | [ChromaDB](https://www.trychroma.com/)           |
| **Relational DB** | [PostgreSQL](https://www.postgresql.org/) (via [Prisma ORM](https://www.prisma.io/)) |

---

## 🚀 Getting Started (Docker-first Setup)

Edit Mind uses Docker Compose to run everything in containers.

### Prerequisites

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
*   That's it! Everything else runs in containers.

### 1. Clone the Repository
```bash
git clone https://github.com/iliashad/edit-mind
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
cp .env.example .env
```

**Edit the `.env` file and configure these critical settings:**
```ini
# 1. SET YOUR VIDEO FOLDER PATH (REQUIRED)
# Must match the path you added to Docker File Sharing
HOST_MEDIA_PATH="/Users/yourusername/Videos"

# 2. CHOOSE AI MODEL (Pick one option)
# Option A: Use Gemini API (easier, requires API key)
USE_LOCAL_MODEL="false"
GEMINI_API_KEY="your-gemini-api-key-from-google-ai-studio"

# Option B: Use Local Model (more private, requires model download)
# USE_LOCAL_MODEL="true"
# SEARCH_AI_MODEL="/app/models/path/to/.gguf"
# The AI model should be downloaded and saved it to models folder in the project root dir

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

#### Step 3.2: Copy Configuration to Docker Directory
```bash
cp .env.system.example .env.system
```


### 4. Start the Services

Start all services with a single command:

```bash
docker compose up
```

**First-time startup will take 5-10+ minutes** as Docker:
- Builds all container images
- Downloads AI models and dependencies
- Initializes databases


### 5. Access the Applications

Once all services are running (look for "ready" messages in logs):

*   **Web App:** [http://localhost:3745](http://localhost:3745)
*   **BullMQ Dashboard:** [http://localhost:4000/(http://localhost:4000) (Job queue monitoring) if you have ```NODE_ENV``` set to ```development```

### 6. Add Your First Videos

1. Navigate to the web app at `http://localhost:3745`
2. Login using admin@example.com and password is admin
3. Navigate to the web app at `http://localhost:3745/app/settings`
4. Click **"Add Folder"**
3. Select a folder from your `HOST_MEDIA_PATH` location
4. The background job service will automatically start processing your videos and will be start watching for new video file events 
5. Monitor progress in the BullMQ dashboard at `http://localhost:4000`

### Troubleshooting

**Problem: "Empty section between colons" error**
```bash
# Solution: Ensure .env is copied to docker directory
cp .env docker/.env
# Verify HOST_MEDIA_PATH is set
grep HOST_MEDIA_PATH .env
```

**Problem: Services won't start**
```bash
# Check Docker is running
docker --version
docker compose version

# View detailed logs
docker compose -f docker/docker-compose.yml logs

# Check service status
docker compose -f docker/docker-compose.yml ps
```

**Problem: Cannot access video files**
```bash
# Verify HOST_MEDIA_PATH is correct
ls -la /your/video/path

# Check Docker file sharing includes this path
# Docker Desktop → Settings → Resources → File Sharing

# Restart Docker after adding paths
```
---

## 🖥️ Desktop Application (Optional)

For the native Electron desktop experience, see [apps/desktop/README.md](apps/desktop/README.md). Note: The desktop app requires local Node.js and pnpm installation.

---

## 📂 Project Structure

```
.
├── apps/                 # Individual applications (desktop, web, background-jobs)
│   ├── background-jobs/  # Node.js service for AI analysis orchestration & job queue
│   ├── desktop/          # Electron desktop application
│   └── web/              # Full-stack web application
├── packages/             # Shared libraries and packages
│   ├── prisma/           # Prisma schema, migrations, and database utilities
│   ├── shared/           # Cross-application constants, types, and utilities
│   └── ui/               # Reusable UI components
├── python/               # Core Python AI/ML analysis services and plugins
├── docker/               # Dockerfiles and docker-compose configurations
└── ...                   # Other configuration files (pnpm-workspace.yaml, .env.example, etc.)
```

For detailed instructions on each application, refer to their respective `README.md` files:
*   [**`apps/desktop/README.md`**](apps/desktop/README.md)
*   [**`apps/web/README.md`**](apps/web/README.md)
*   [**`apps/background-jobs/README.md`**](apps/background-jobs/README.md)

---
## 🤝 Special Shoutout

I would like to thank the community of/r/selfhost for their amazing support and feedback (https://www.reddit.com/r/selfhosted/comments/1ogis3j/i_built_a_selfhosted_alternative_to_googles_video/)


## 🤝 Contributing

We welcome contributions of all kinds! Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.
