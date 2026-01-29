ARG PYTHON_VERSION=3.11
ARG CUDA_VERSION=12.1.0

FROM python:${PYTHON_VERSION}-slim-bookworm AS base-cpu

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev \
    libssl-dev \
    libgomp1 \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /ml-models/ultralytics && mkdir -p /ml-models/whisper && \
    chmod -R 777 /ml-models

WORKDIR /app

FROM nvidia/cuda:${CUDA_VERSION}-runtime-ubuntu22.04 AS base-gpu
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*
    
WORKDIR /app


RUN mkdir -p /ml-models/ultralytics && mkdir -p /ml-models/whisper && \
    chmod -R 777 /ml-models

WORKDIR /app

FROM base-cpu AS python-deps-cpu

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    libglib2.0-0 libgl1 libsm6 libxext6 libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx

WORKDIR /app
COPY python/requirements.txt ./python/

RUN --mount=type=cache,id=pip-cpu,target=/pip/store \
    uv venv /app/.venv && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements.txt

FROM base-gpu AS python-deps-gpu

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv

COPY python/requirements-cuda.txt ./python/

RUN --mount=type=cache,id=pip-gpu,target=/pip/store \
    uv venv /app/.venv && \
    VIRTUAL_ENV=/app/.venv uv pip install --no-cache -r python/requirements-cuda.txt

FROM base-cpu AS production

WORKDIR /app

COPY --from=python-deps-cpu /app/.venv ./.venv
COPY python ./python

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE ${ML_PORT}

CMD ["sh", "-c", "python /app/python/main.py --host 0.0.0.0 --port ${ML_PORT}"]


FROM base-gpu AS production-gpu

WORKDIR /app

COPY --from=python-deps-gpu /app/.venv ./.venv
COPY python ./python

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

EXPOSE ${ML_PORT}

CMD ["sh", "-c", "python /app/python/main.py --host 0.0.0.0 --port ${ML_PORT}"]

FROM base-cpu AS development

WORKDIR /app

COPY --from=python-deps-cpu /app/.venv ./.venv
COPY python ./python

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE ${ML_PORT}

CMD ["sh", "-c", "python /app/python/main.py --host 0.0.0.0 --port ${ML_PORT}"]

FROM base-gpu AS development-gpu

WORKDIR /app

COPY --from=python-deps-gpu /app/.venv ./.venv
COPY python ./python

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

EXPOSE ${ML_PORT}

CMD ["sh", "-c", "python /app/python/main.py --host 0.0.0.0 --port ${ML_PORT}"]

FROM base-cpu AS testing

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx

COPY python ./python/

RUN --mount=type=cache,id=pip-cpu,target=/pip/store \
    uv venv /app/.venv && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements.txt && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements-dev.txt

ENV PATH="/app/.venv/bin:$PATH" \
    VIRTUAL_ENV="/app/.venv"

WORKDIR /app/python
RUN if [ -d tests ]; then pytest tests; else echo "No tests yet, skipping pytest"; fi

FROM base-gpu AS testing-gpu

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx

COPY python ./python/

RUN --mount=type=cache,id=pip-gpu,target=/pip/store \
    uv venv /app/.venv && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements-gpu.txt && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements-dev.txt

ENV PATH="/app/.venv/bin:$PATH" \
    VIRTUAL_ENV="/app/.venv" \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

WORKDIR /app/python
RUN if [ -d tests ]; then pytest tests; else echo "No tests yet, skipping pytest"; fi