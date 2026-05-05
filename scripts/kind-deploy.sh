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
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(openssl rand -base64 32)}"

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

case "$(cd "$(dirname "${MEDIA_PATH}")" && pwd)/$(basename "${MEDIA_PATH}")" in
  /|/bin|/boot|/dev|/etc|/lib|/lib64|/proc|/root|/run|/sbin|/sys|/usr|/var)
    echo "MEDIA_PATH points to a system directory. Choose a dedicated media directory." >&2
    exit 1
    ;;
esac

mkdir -p "${MEDIA_PATH}"
if [ ! -d "${MEDIA_PATH}" ] || [ ! -r "${MEDIA_PATH}" ]; then
  echo "MEDIA_PATH must be a readable directory: ${MEDIA_PATH}" >&2
  exit 1
fi

KIND_CONFIG="$(mktemp)"
trap 'rm -f "${KIND_CONFIG}"' EXIT

cat > "${KIND_CONFIG}" <<CONFIG
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: ${NODE_PORT}
        hostPort: ${WEB_PORT}
        protocol: TCP
    extraMounts:
      - hostPath: ${MEDIA_PATH}
        containerPath: ${NODE_MEDIA_PATH}
CONFIG

if ! kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  kind create cluster --name "${CLUSTER_NAME}" --config "${KIND_CONFIG}"
else
  echo "Using existing Kind cluster '${CLUSTER_NAME}'."
fi

kubectl config use-context "kind-${CLUSTER_NAME}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install "${RELEASE_NAME}" "${CHART_DIR}" \
  --namespace "${NAMESPACE}" \
  --set media.hostPath="${NODE_MEDIA_PATH}" \
  --set media.mountPath="${NODE_MEDIA_PATH}" \
  --set web.port="${WEB_PORT}" \
  --set web.service.nodePort="${NODE_PORT}" \
  --set secrets.postgresPassword="${POSTGRES_PASSWORD}" \
  --set secrets.sessionSecret="${SESSION_SECRET}" \
  --set secrets.encryptionKey="${ENCRYPTION_KEY}" \
  "$@"

cat <<MESSAGE

Edit Mind is being deployed to Kind cluster '${CLUSTER_NAME}'.

Media directory: ${MEDIA_PATH}
Namespace: ${NAMESPACE}
Release: ${RELEASE_NAME}
URL: http://localhost:${WEB_PORT}

Check rollout status with:
  kubectl -n ${NAMESPACE} get pods
MESSAGE
