ARG PYTHON_VERSION=3.11

FROM python:${PYTHON_VERSION}-slim-bookworm AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev libssl-dev && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /ml-models/ultralytics && \
    chmod -R 777 /ml-models

WORKDIR /app

FROM base AS python-deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libopenblas-dev \
    libglib2.0-0 libgl1 libsm6 libxext6 libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx

WORKDIR /app
COPY python/requirements.txt ./python/

RUN --mount=type=cache,id=pip,target=/pip/store \
    uv venv /app/.venv && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements.txt

FROM python-deps AS production

WORKDIR /app

COPY --from=python-deps /app/.venv ./.venv
COPY python ./python

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE ${ML_PORT}


CMD ["sh", "-c", "python ./python/main.py --host 0.0.0.0 --port ${ML_PORT}"]

FROM python-deps AS development

WORKDIR /app

COPY --from=python-deps /app/.venv ./.venv
COPY python ./python

ENV ML_PORT=8765

EXPOSE ${ML_PORT}


CMD ["sh", "-c", "python ./python/main.py --host 0.0.0.0 --port ${ML_PORT}"]

FROM base AS testing

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx

COPY python ./python/

RUN --mount=type=cache,id=pip,target=/pip/store \
    uv venv /app/.venv && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements.txt && \
    VIRTUAL_ENV=/app/.venv uv pip install -r python/requirements-dev.txt

ENV PATH="/app/.venv/bin:$PATH" \
    VIRTUAL_ENV="/app/.venv"

WORKDIR /app/python
RUN if [ -d tests ]; then pytest tests; else echo "No tests yet, skipping pytest"; fi