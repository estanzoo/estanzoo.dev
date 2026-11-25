#!/usr/bin/env bash
# Write <checkout>/.env with the ports of this checkout (blueprint R1).
#
#   tools/worktree-env.sh [--force] [checkout-dir]
#
# The ports come from a hash of '<checkout-dir-name>/site', so each checkout
# gets its own ports and the same checkout always gets the same ports.
# A port that browsers refuse (net::ERR_UNSAFE_PORT) moves up to the next port
# of its range that they accept, so every other port stays as the hash gives it.
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

# Ports that browsers refuse to load. The union of Chromium's kRestrictedPorts
# (net/base/port_util.cc on main) and the WHATWG Fetch "bad port" list (Living
# Standard, last updated 2026-11-20), both read on 2026-11-24. Fetch adds 4190
# and 6679 to Chromium's list.
blocked_ports=" 0 1 7 9 11 13 15 17 19 20 21 22 23 25 37 42 43 53 69 77 79 87 95
  101 102 103 104 109 110 111 113 115 117 119 123 135 137 139 143 161 179 389
  427 465 512 513 514 515 526 530 531 532 540 548 554 556 563 587 601 636 989
  990 993 995 1719 1720 1723 2049 3659 4045 4190 5060 5061 6000 6566 6665 6666
  6667 6668 6669 6679 6697 10080 "
blocked_ports="$(printf '%s' "$blocked_ports" | tr -s ' \n' '  ') "

# safe_port <base> <offset>: base+offset, or the next port of base+1..base+999
# (wrapping) that is not blocked.
safe_port() {
  local base=$1 o=$2
  while case "$blocked_ports" in *" $((base + o)) "*) true ;; *) false ;; esac; do
    o=$(( (o % 999) + 1 ))
  done
  echo $((base + o))
}

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
DEV_PORT=$(safe_port 5200 "$off")
PREVIEW_PORT=$(safe_port 6200 "$off")
SCREENS_PORT=$(safe_port 7200 "$off")
EOF
  echo "wrote $env_file"
fi
cat "$env_file"
