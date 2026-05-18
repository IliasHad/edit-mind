#!/usr/bin/env bash
# Edit Mind MCP server installer — downloads the pre-built server and registers it with Claude Code.
# https://github.com/IliasHad/edit-mind
set -euo pipefail

REPO="IliasHad/edit-mind"
RELEASE_URL="${EDIT_MIND_MCP_URL:-https://github.com/${REPO}/releases/latest/download/edit-mind-mcp.js}"
INSTALL_DIR="$HOME/.local/share/edit-mind-mcp"
BIN="$INSTALL_DIR/index.js"

trap 'printf "\nsetup failed (line %s)\n" "$LINENO" >&2' ERR

# --- output ----------------------------------------------------------------
if [[ -t 1 ]]; then
  bold=$'\033[1m'; dim=$'\033[2m'
  green=$'\033[32m'; yellow=$'\033[33m'; red=$'\033[31m'; reset=$'\033[0m'
else
  bold='' dim='' green='' yellow='' red='' reset=''
fi

log()  { printf '%s\n' "$*"; }
ok()   { printf '%s\n' "${green}✓ $*${reset}"; }
warn() { printf '%s\n' "${yellow}$*${reset}" >&2; }
die()  { printf '%s\n' "${red}error: $*${reset}" >&2; exit 1; }

# --- prerequisites ---------------------------------------------------------
command -v curl   >/dev/null || die "curl is required."
command -v node   >/dev/null || die "Node.js is required. Install from https://nodejs.org"
command -v claude >/dev/null || die "Claude Code is required. Run: npm install -g @anthropic-ai/claude-code"

# Node.js >= 18 required
node_major=$(node --version | sed 's/v\([0-9]*\).*/\1/')
[[ "$node_major" -ge 18 ]] || die "Node.js 18 or higher is required (found $(node --version))."

# --- intro -----------------------------------------------------------------
log
log "${bold}Edit Mind MCP Installer${reset}"
log

# --- download --------------------------------------------------------------
log "Downloading MCP server..."
mkdir -p "$INSTALL_DIR"
curl -fSL "$RELEASE_URL" -o "$BIN"
ok "Downloaded to $BIN"

# --- config ----------------------------------------------------------------
log
read -rp "Edit Mind URL [http://localhost:4000]: " EDIT_MIND_HOST
EDIT_MIND_HOST="${EDIT_MIND_HOST:-http://localhost:4000}"
EDIT_MIND_HOST="${EDIT_MIND_HOST%/}"

log "${dim}Create a token at ${EDIT_MIND_HOST}/app/settings?tab=tokens${reset}"
EDIT_MIND_TOKEN=""
while [[ -z "$EDIT_MIND_TOKEN" ]]; do
  read -rsp "Access token: " EDIT_MIND_TOKEN
  printf '\n'
done

# --- register with Claude --------------------------------------------------
log
log "Registering with Claude Code..."
claude mcp add edit-mind \
  -e EDIT_MIND_HOST="$EDIT_MIND_HOST" \
  -e EDIT_MIND_TOKEN="$EDIT_MIND_TOKEN" \
  -- node "$BIN"

# --- done ------------------------------------------------------------------
log
ok "Edit Mind MCP server installed."
log
log "  Restart Claude Code to load the server."
log "  Available tools: search_video_scenes, view_media, list_videos,"
log "                   get_video, list_collections, get_collection, get_suggestions"
log
log "To update later, re-run this script."
log
