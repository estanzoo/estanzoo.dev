#!/usr/bin/env bash
# Write <checkout>/.env with the ports of this checkout (blueprint R1).
#
#   tools/worktree-env.sh [--force] [checkout-dir]
#
# The ports come from a hash of '<checkout-dir-name>/site', so each checkout
# gets its own ports and the same checkout always gets the same ports.
# An existing .env is kept, so a hand edit survives. --force rewrites it.
# The checkout defaults to the one that holds this script.
set -euo pipefail

force=false
checkout=""
for arg in "$@"; do
  case "$arg" in
    --force) force=true ;;
    -*) echo "usage: $0 [--force] [checkout-dir]" >&2; exit 2 ;;
    *) checkout="$arg" ;;
  esac
done

if [ -z "$checkout" ]; then
  checkout="$(dirname "${BASH_SOURCE[0]}")/.."
fi
if [ ! -d "$checkout" ]; then
  echo "worktree-env: no such directory: $checkout" >&2
  exit 1
fi
checkout="$(cd "$checkout" && pwd -P)"
env_file="$checkout/.env"

if [ -f "$env_file" ] && [ "$force" != true ]; then
  echo "kept $env_file"
else
  name="$(basename "$checkout")"
  if command -v sha256sum >/dev/null 2>&1; then
    h="$(printf '%s' "$name/site" | sha256sum | cut -c1-8)"
  else
    h="$(printf '%s' "$name/site" | shasum -a 256 | cut -c1-8)"
  fi
  off=$(( (16#$h % 999) + 1 ))
  cat > "$env_file" <<EOF
DEV_PORT=$((5200 + off))
PREVIEW_PORT=$((6200 + off))
SCREENS_PORT=$((7200 + off))
EOF
  echo "wrote $env_file"
fi
cat "$env_file"
