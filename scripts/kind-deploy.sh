#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHART_DIR="${ROOT_DIR}/charts/edit-mind"
CLUSTER_NAME="${KIND_CLUSTER_NAME:-edit-mind}"
NAMESPACE="${KIND_NAMESPACE:-edit-mind}"
RELEASE_NAME="${HELM_RELEASE_NAME:-edit-mind}"
MEDIA_PATH="${MEDIA_PATH:-${ROOT_DIR}/media}"
NODE_MEDIA_PATH="${KIND_NODE_MEDIA_PATH:-/media/videos}"
WEB_PORT="${WEB_PORT:-3745}"
NODE_PORT="${NODE_PORT:-30080}"
BACKGROUND_JOBS_HOST_PORT="${BACKGROUND_JOBS_HOST_PORT:-4000}"
BACKGROUND_JOBS_NODE_PORT="${BACKGROUND_JOBS_NODE_PORT:-30040}"
REGISTRY_CACHE_DIR="${REGISTRY_CACHE_DIR:-${HOME}/.kind-registry-cache}"
DOCKERHUB_MIRROR_NAME="${DOCKERHUB_MIRROR_NAME:-kind-registry-dockerhub}"
GHCR_MIRROR_NAME="${GHCR_MIRROR_NAME:-kind-registry-ghcr}"
DOCKERHUB_MIRROR_HOST_PORT="${DOCKERHUB_MIRROR_HOST_PORT:-5001}"
GHCR_MIRROR_HOST_PORT="${GHCR_MIRROR_HOST_PORT:-5002}"
GPU_ENABLED="${GPU_ENABLED:-auto}"
NVIDIA_DEVICE_PLUGIN_VERSION="${NVIDIA_DEVICE_PLUGIN_VERSION:-v0.17.0}"
CONTAINERD_PERSIST_DIR="${CONTAINERD_PERSIST_DIR:-${HOME}/.kind-containerd-cache/${CLUSTER_NAME}}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
SESSION_SECRET="${SESSION_SECRET:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command docker
require_command kind
require_command kubectl
require_command helm
require_command openssl
require_command realpath
require_command base64

is_system_path() {
  local path="$1"
  local system_dirs=(/ /bin /boot /dev /etc /lib /lib64 /proc /root /run /sbin /sys /usr /var)

  for dir in "${system_dirs[@]}"; do
    if [ "${path}" = "${dir}" ] || [[ "${path}" == "${dir}/"* ]]; then
      return 0
    fi
  done

  return 1
}

chart_fullname() {
  if [[ "${RELEASE_NAME}" == *edit-mind* ]]; then
    printf '%s' "${RELEASE_NAME}"
  else
    printf '%s-edit-mind' "${RELEASE_NAME}"
  fi
}

ensure_registry_mirror() {
  local name="$1"
  local host_port="$2"
  local upstream="$3"
  local data_dir="${REGISTRY_CACHE_DIR}/${name}"

  mkdir -p "${data_dir}"

  if [ "$(docker inspect -f '{{.State.Running}}' "${name}" 2>/dev/null)" = "true" ]; then
    return
  fi

  docker rm -f "${name}" >/dev/null 2>&1 || true
  docker run -d --restart=always \
    --name "${name}" \
    -e REGISTRY_PROXY_REMOTEURL="${upstream}" \
    -v "${data_dir}:/var/lib/registry" \
    -p "127.0.0.1:${host_port}:5000" \
    registry:2 >/dev/null
}

connect_mirror_to_kind_network() {
  local name="$1"
  if ! docker network inspect kind >/dev/null 2>&1; then
    return
  fi
  if docker network inspect kind --format '{{range .Containers}}{{.Name}} {{end}}' | grep -qw "${name}"; then
    return
  fi
  docker network connect kind "${name}"
}

reuse_secret_value() {
  local secret_name="$1"
  local key="$2"
  local encoded

  encoded="$(kubectl -n "${NAMESPACE}" get secret "${secret_name}" -o "jsonpath={.data.${key}}" 2>/dev/null || true)"
  if [ -n "${encoded}" ]; then
    if ! printf '%s' "${encoded}" | base64 --decode 2>/dev/null; then
      printf '%s' "${encoded}" | base64 -D
    fi
  fi
}

mkdir -p "${MEDIA_PATH}"
MEDIA_PATH_REAL="$(realpath "${MEDIA_PATH}")"

if is_system_path "${MEDIA_PATH_REAL}"; then
  echo "MEDIA_PATH points to a system directory. Choose a dedicated media directory." >&2
  exit 1
fi

if [ ! -d "${MEDIA_PATH_REAL}" ] || [ ! -r "${MEDIA_PATH_REAL}" ]; then
  echo "MEDIA_PATH must be a readable directory: ${MEDIA_PATH}" >&2
  exit 1
fi

ensure_registry_mirror "${DOCKERHUB_MIRROR_NAME}" "${DOCKERHUB_MIRROR_HOST_PORT}" "https://registry-1.docker.io"
ensure_registry_mirror "${GHCR_MIRROR_NAME}" "${GHCR_MIRROR_HOST_PORT}" "https://ghcr.io"

mkdir -p "${CONTAINERD_PERSIST_DIR}"

if [ "${GPU_ENABLED}" = "auto" ]; then
  if docker info 2>/dev/null | grep -q '^ Default Runtime: nvidia'; then
    GPU_ENABLED="true"
  else
    GPU_ENABLED="false"
  fi
fi

GPU_CONTAINERD_PATCH=""
GPU_EXTRA_MOUNTS=""
if [ "${GPU_ENABLED}" = "true" ]; then
  GPU_CONTAINERD_PATCH=$'  - |-\n    [plugins."io.containerd.grpc.v1.cri".containerd]\n      default_runtime_name = "nvidia"\n    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia]\n      runtime_type = "io.containerd.runc.v2"\n    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia.options]\n      BinaryName = "/usr/bin/nvidia-container-runtime"\n      SystemdCgroup = true'
  GPU_EXTRA_MOUNTS=$'\n      - hostPath: /usr/bin/nvidia-container-runtime\n        containerPath: /usr/bin/nvidia-container-runtime\n      - hostPath: /usr/bin/nvidia-container-runtime-hook\n        containerPath: /usr/bin/nvidia-container-runtime-hook\n      - hostPath: /usr/bin/nvidia-ctk\n        containerPath: /usr/bin/nvidia-ctk\n      - hostPath: /dev/null\n        containerPath: /var/run/nvidia-container-devices/all'
fi

KIND_CONFIG="$(mktemp)"
trap 'rm -f "${KIND_CONFIG}"' EXIT

cat > "${KIND_CONFIG}" <<CONFIG
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
  - |-
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["http://${DOCKERHUB_MIRROR_NAME}:5000"]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."ghcr.io"]
      endpoint = ["http://${GHCR_MIRROR_NAME}:5000"]
${GPU_CONTAINERD_PATCH}
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: ${NODE_PORT}
        hostPort: ${WEB_PORT}
        protocol: TCP
      - containerPort: ${BACKGROUND_JOBS_NODE_PORT}
        hostPort: ${BACKGROUND_JOBS_HOST_PORT}
        protocol: TCP
    extraMounts:
      - hostPath: ${MEDIA_PATH_REAL}
        containerPath: ${NODE_MEDIA_PATH}
      - hostPath: ${CONTAINERD_PERSIST_DIR}
        containerPath: /var/lib/containerd${GPU_EXTRA_MOUNTS}
CONFIG

if ! kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  kind create cluster --name "${CLUSTER_NAME}" --config "${KIND_CONFIG}"
else
  echo "Using existing Kind cluster '${CLUSTER_NAME}'."
  echo "Ensure it was created with host port ${WEB_PORT}->${NODE_PORT} and media mount ${MEDIA_PATH_REAL}->${NODE_MEDIA_PATH}."
fi

connect_mirror_to_kind_network "${DOCKERHUB_MIRROR_NAME}"
connect_mirror_to_kind_network "${GHCR_MIRROR_NAME}"

if [ "${GPU_ENABLED}" = "true" ]; then
  echo "GPU enabled: installing NVIDIA device plugin (${NVIDIA_DEVICE_PLUGIN_VERSION})."
  kubectl apply -f "https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/${NVIDIA_DEVICE_PLUGIN_VERSION}/deployments/static/nvidia-device-plugin.yml"
fi

kubectl config use-context "kind-${CLUSTER_NAME}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

SECRET_NAME="$(chart_fullname)-secrets"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(reuse_secret_value "${SECRET_NAME}" POSTGRES_PASSWORD)}"
SESSION_SECRET="${SESSION_SECRET:-$(reuse_secret_value "${SECRET_NAME}" SESSION_SECRET)}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(reuse_secret_value "${SECRET_NAME}" ENCRYPTION_KEY)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(openssl rand -base64 32)}"

helm upgrade --install "${RELEASE_NAME}" "${CHART_DIR}" \
  --namespace "${NAMESPACE}" \
  --set media.hostPath="${NODE_MEDIA_PATH}" \
  --set media.mountPath="${NODE_MEDIA_PATH}" \
  --set web.port="${WEB_PORT}" \
  --set web.service.nodePort="${NODE_PORT}" \
  --set web.externalUrl="http://localhost:${WEB_PORT}" \
  --set backgroundJobs.service.nodePort="${BACKGROUND_JOBS_NODE_PORT}" \
  --set gpu.enabled="${GPU_ENABLED}" \
  --set secrets.postgresPassword="${POSTGRES_PASSWORD}" \
  --set secrets.sessionSecret="${SESSION_SECRET}" \
  --set secrets.encryptionKey="${ENCRYPTION_KEY}" \
  "$@"

cat <<MESSAGE

Edit Mind is being deployed to Kind cluster '${CLUSTER_NAME}'.

Media directory: ${MEDIA_PATH_REAL}
Namespace: ${NAMESPACE}
Release: ${RELEASE_NAME}
URL: http://localhost:${WEB_PORT}

Check rollout status with:
  kubectl -n ${NAMESPACE} get pods
MESSAGE
