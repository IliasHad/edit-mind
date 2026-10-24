#!/usr/bin/env bash
#
# Orcah Studio / Edit Mind self-hosted installer.
#
# Run this from a cloned checkout:
#   ./install.sh
#
# Or run it directly from GitHub:
#   bash <(curl -fsSL https://raw.githubusercontent.com/IliasHad/edit-mind/main/install.sh)
#
# The implementation lives in scripts/install.sh so that existing setup links
# keep working too.  Keeping this small top-level entry point makes the
# supported command easy to find for people who do not work with code daily.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P 2>/dev/null || true)"
LOCAL_INSTALLER="$SCRIPT_DIR/scripts/install.sh"

if [[ -f "$LOCAL_INSTALLER" ]]; then
  exec "$LOCAL_INSTALLER" "$@"
fi

# `bash <(curl ...)` has no project checkout beside it. Download the same
# implementation into a process substitution, which keeps standard input
# connected to the person's terminal for the install questions.
command -v curl >/dev/null 2>&1 || {
  printf '%s\n' 'error: curl is required to download the installer.' >&2
  exit 1
}
exec bash <(curl -fsSL "https://raw.githubusercontent.com/IliasHad/edit-mind/main/scripts/install.sh") "$@"
