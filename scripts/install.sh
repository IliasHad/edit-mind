#!/usr/bin/env bash
# Edit Mind installer — sets up the Docker stack, .env, and (optionally) Ollama.
# https://github.com/IliasHad/edit-mind
set -euo pipefail

REPO="https://raw.githubusercontent.com/IliasHad/edit-mind/refs/heads/main"
DEFAULT_INSTALL_DIR="$HOME/edit-mind"
OLLAMA_MODEL="qwen2.5:7b-instruct"

trap 'printf "\nsetup failed (line %s)\n" "$LINENO" >&2' ERR

# --- output ----------------------------------------------------------------
if [[ -t 1 ]]; then
  bold=$'\033[1m'; dim=$'\033[2m'
  green=$'\033[32m'; yellow=$'\033[33m'; red=$'\033[31m'; reset=$'\033[0m'
else
  bold='' dim='' green='' yellow='' red='' reset=''
fi

log()  { printf '%s\n' "$*"; }
ok()   { printf '%s\n' "${green}$*${reset}"; }
warn() { printf '%s\n' "${yellow}$*${reset}" >&2; }
die()  { printf '%s\n' "${red}error: $*${reset}" >&2; exit 1; }

ask() {  # ask "label" "default" -> echoes user's answer or default
  local label=$1 default=${2-} reply
  if [[ -n "$default" ]]; then
    read -rep "$label [$default]: " reply
    printf '%s' "${reply:-$default}"
  else
    read -rep "$label: " reply
    printf '%s' "$reply"
  fi
}

confirm() {  # confirm "label" -> 0 yes / 1 no, default yes
  local reply
  read -rp "$1 [Y/n]: " reply
  [[ -z "$reply" || "$reply" =~ ^[Yy] ]]
}

# --- platform --------------------------------------------------------------
case "${OSTYPE:-}" in
  darwin*)        OS=mac ;;
  msys*|cygwin*)  OS=windows ;;
  *)              OS=linux ;;   # includes WSL
esac

# --- prerequisites ---------------------------------------------------------
command -v curl   >/dev/null || die "curl is required."
command -v docker >/dev/null || die "Docker is not installed. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"

# 'docker info' can hang while Docker Desktop is starting. Cap it.
docker_running() {
  if   command -v timeout  >/dev/null; then timeout  10 docker info >/dev/null 2>&1
  elif command -v gtimeout >/dev/null; then gtimeout 10 docker info >/dev/null 2>&1
  else                                       docker info             >/dev/null 2>&1
  fi
}

if ! docker_running; then
  if [[ "$OS" == linux ]] && command -v systemctl >/dev/null; then
    log "Starting Docker..."
    sudo systemctl start docker || true
    sleep 3
    docker_running || die "Could not start Docker. Try: sudo systemctl start docker"
  else
    die "Docker is installed but not running. Open Docker Desktop, wait for it to load, and re-run."
  fi
fi

# --- intro -----------------------------------------------------------------
log
log "${bold}Edit Mind setup${reset} ${dim}— local AI video knowledge base${reset}"
log

# --- install location ------------------------------------------------------
INSTALL_DIR=$(ask "Install directory" "$DEFAULT_INSTALL_DIR")
INSTALL_DIR=${INSTALL_DIR/#\~/$HOME}
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Never silently overwrite existing secrets.
if [[ -f .env ]]; then
  backup=".env.backup-$(date -u +%Y%m%d-%H%M%S)"
  mv .env "$backup"
  warn "Existing .env saved as $backup"
fi

# --- compose file (CPU vs GPU) ---------------------------------------------
USE_GPU=n
if [[ "$OS" != mac ]]; then
  read -rp "Use NVIDIA GPU acceleration? [y/N]: " USE_GPU
  USE_GPU=${USE_GPU:-n}
fi

if [[ "$USE_GPU" =~ ^[Yy]$ ]]; then
  curl -fsSL "$REPO/docker-compose.cuda.yml" -o docker-compose.yml
  ok "Installed CUDA docker-compose.yml"
else
  curl -fsSL "$REPO/docker-compose.yml" -o docker-compose.yml
  ok "Installed docker-compose.yml"
fi
[[ -s docker-compose.yml ]] || die "docker-compose.yml download was empty."

# --- media path ------------------------------------------------------------
log
case "$OS" in
  mac) default_media="$HOME/Movies" ;;
  *)   default_media="$HOME/Videos" ;;
esac
MEDIA_PATH=$(ask "Path to your video library" "$default_media")
MEDIA_PATH=${MEDIA_PATH/#\~/$HOME}
mkdir -p "$MEDIA_PATH"

# --- AI provider -----------------------------------------------------------
log
log "${bold}AI provider${reset}"
log "  1) Ollama   runs on this machine, no API key"
log "  2) Gemini   Google cloud, fast, free key at https://aistudio.google.com/apikey"
provider=$(ask "Choose 1 or 2" "1")

USE_OLLAMA=false
USE_GEMINI=false
GEMINI_API_KEY=""
OLLAMA_HOST_URL=""

case "$provider" in
  2)
    USE_GEMINI=true
    while [[ -z "$GEMINI_API_KEY" ]]; do
      read -rp "Gemini API key: " GEMINI_API_KEY
    done
    ;;
  *)
    USE_OLLAMA=true
    # Bridge address Docker containers use to reach the host's Ollama.
    case "$OS" in
      linux) OLLAMA_HOST_URL="http://172.17.0.1" ;;
      *)     OLLAMA_HOST_URL="http://host.docker.internal" ;;
    esac
    if command -v ollama >/dev/null; then
      log
      log "Pulling $OLLAMA_MODEL (large download, first run only)..."
      OLLAMA_HOST=0.0.0.0 ollama pull "$OLLAMA_MODEL" \
        || warn "Pull failed. Make sure 'OLLAMA_HOST=0.0.0.0 ollama serve' is running, then run 'ollama pull $OLLAMA_MODEL' yourself."
    else
      warn "Ollama isn't installed. Install from https://ollama.com/download, then:"
      log  "    OLLAMA_HOST=0.0.0.0 ollama serve"
      log  "    ollama pull $OLLAMA_MODEL"
    fi
    ;;
esac

# --- secrets ---------------------------------------------------------------
gen_key() {  # gen_key <bytes> <base64|hex>
  local n=$1 fmt=$2
  if command -v openssl >/dev/null; then
    if [[ "$fmt" == hex ]]; then openssl rand -hex "$n"
    else                          openssl rand -base64 "$n"
    fi
  elif [[ -r /dev/urandom ]]; then
    if [[ "$fmt" == hex ]]; then
      head -c "$n" /dev/urandom | od -An -tx1 | tr -d ' \n'
    else
      head -c "$n" /dev/urandom | base64 | tr -d '\n'
    fi
  else
    die "Need openssl or /dev/urandom to generate secrets."
  fi
}
ENCRYPTION_KEY=$(gen_key 32 base64)
SESSION_SECRET=$(gen_key 32 hex)

# --- .env ------------------------------------------------------------------
# Pull the upstream template, drop any keys we own, then append our values.
# This avoids fragile in-place edits and guarantees a single definition per key.
curl -fsSL "$REPO/.env.example"        -o .env.tmpl
curl -fsSL "$REPO/.env.system.example" -o .env.system

owned='^(HOST_MEDIA_PATH|ENCRYPTION_KEY|SESSION_SECRET|USE_OLLAMA_MODEL|USE_GEMINI|OLLAMA_HOST|OLLAMA_PORT|OLLAMA_MODEL|GEMINI_API_KEY)='
grep -Ev "$owned" .env.tmpl > .env || true
rm -f .env.tmpl

{
  echo
  echo "# --- generated by setup.sh ---"
  echo "HOST_MEDIA_PATH=\"$MEDIA_PATH\""
  echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
  echo "SESSION_SECRET=\"$SESSION_SECRET\""
  echo "USE_OLLAMA_MODEL=\"$USE_OLLAMA\""
  echo "USE_GEMINI=\"$USE_GEMINI\""
  if $USE_OLLAMA; then
    echo "OLLAMA_HOST=\"$OLLAMA_HOST_URL\""
    echo "OLLAMA_PORT=\"11434\""
    echo "OLLAMA_MODEL=\"$OLLAMA_MODEL\""
  fi
  if $USE_GEMINI; then
    echo "GEMINI_API_KEY=\"$GEMINI_API_KEY\""
  fi
} >> .env
chmod 600 .env
ok "Wrote $(pwd)/.env"

# --- desktop file-sharing reminder -----------------------------------------
if [[ "$OS" != linux ]]; then
  log
  log "${yellow}Docker Desktop file sharing:${reset} grant access to your video folder."
  log "  Settings → Resources → File Sharing → add: $MEDIA_PATH → Apply & Restart"
  log "  (Docker often pops a dialog automatically the first time it sees the path.)"
  read -rp "Press Enter to continue..." _
fi

# --- done ------------------------------------------------------------------
log
ok "Setup complete."
log
log "  cd \"$INSTALL_DIR\""
log "  docker compose up"
log "  open http://localhost:3745"
log
log "If this is useful: ${bold}https://github.com/IliasHad/edit-mind${reset}"
log

confirm "Start Edit Mind now?" || exit 0

# Open the browser once the stack has had time to come up. Detached so it
# won't keep us alive past the docker compose process.
( sleep 12
  case "$OS" in
    mac)     open      "http://localhost:3745" ;;
    windows) start     "http://localhost:3745" ;;
    *)       xdg-open  "http://localhost:3745" ;;
  esac >/dev/null 2>&1 || true
) & disown

exec docker compose up