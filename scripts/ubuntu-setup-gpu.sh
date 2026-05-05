#!/usr/bin/env bash
# Configure an Ubuntu host so kind clusters launched by scripts/kind-deploy.sh
# can use the local NVIDIA GPU. Idempotent — safe to re-run.
#
# Run with sudo:  sudo bash scripts/ubuntu-setup-gpu.sh
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "This script must run as root. Try: sudo bash $0" >&2
  exit 1
fi

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "nvidia-smi not found. Install the NVIDIA driver first." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install docker first." >&2
  exit 1
fi

if ! dpkg -s nvidia-container-toolkit >/dev/null 2>&1; then
  echo "Installing nvidia-container-toolkit..."
  if ! grep -rq "nvidia.github.io/libnvidia-container" /etc/apt/sources.list.d/ /etc/apt/sources.list 2>/dev/null; then
    distribution="$(. /etc/os-release; echo "${ID}${VERSION_ID}")"
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -fsSL "https://nvidia.github.io/libnvidia-container/${distribution}/libnvidia-container.list" \
      | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
      > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  fi
  apt-get update
  apt-get install -y nvidia-container-toolkit
else
  echo "nvidia-container-toolkit already installed."
fi

NEED_DOCKER_RESTART="false"

if ! docker info 2>/dev/null | grep -q '^ Default Runtime: nvidia'; then
  echo "Configuring docker to use the nvidia runtime by default..."
  nvidia-ctk runtime configure --runtime=docker --set-as-default
  NEED_DOCKER_RESTART="true"
else
  echo "docker default runtime is already nvidia."
fi

CONFIG_FILE="/etc/nvidia-container-runtime/config.toml"
if [ -f "${CONFIG_FILE}" ]; then
  CURRENT_VALUE="$(nvidia-ctk config --config-file "${CONFIG_FILE}" 2>/dev/null \
    | awk -F'=' '/^accept-nvidia-visible-devices-as-volume-mounts/ {gsub(/[ \t]/,"",$2); print $2}')"
  if [ "${CURRENT_VALUE}" != "true" ]; then
    echo "Enabling accept-nvidia-visible-devices-as-volume-mounts..."
    nvidia-ctk config --set accept-nvidia-visible-devices-as-volume-mounts=true --in-place
    NEED_DOCKER_RESTART="true"
  else
    echo "accept-nvidia-visible-devices-as-volume-mounts is already true."
  fi
fi

if [ "${NEED_DOCKER_RESTART}" = "true" ]; then
  echo "Restarting docker..."
  systemctl restart docker
fi

echo
echo "Smoke test: docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi"
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi >/dev/null
echo "GPU passthrough verified."

cat <<'MESSAGE'

Host is ready for GPU-enabled kind clusters.

Next: recreate the kind cluster so it picks up the new docker runtime config.
  kind delete cluster --name edit-mind
  bash scripts/kind-deploy.sh
MESSAGE
