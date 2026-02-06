ARG PYTHON_VERSION=3.11
ARG CUDA_VERSION=12.8.0

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