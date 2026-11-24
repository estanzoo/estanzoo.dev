#!/usr/bin/env bash
# Run the Playwright screenshot tests inside the official Playwright Docker image, so
# every run (laptop or CI) renders with the same Linux fonts and browser build.
#
#   tools/screenshots/docker.sh [playwright test args...]   npm run screenshots
#   tools/screenshots/docker.sh -u                          npm run screenshots:update
#
# The image tag is the @playwright/test version in package-lock.json. The repo is
# mounted at /work; node_modules is a container-local named volume per checkout, so
# the host node_modules (macOS binaries) stay untouched. Inside the container it runs
# npm ci (only when package-lock.json changed), writes .env if missing, renders every
# mock (screens:renderAll), builds the site and runs playwright test.
# Docker on macOS runs through colima: started here when 'docker info' fails.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
version="$(sed -n '/"node_modules\/@playwright\/test"/,/}/s/.*"version": "\([^"]*\)".*/\1/p' "$root/package-lock.json")"
if [ -z "$version" ]; then
  echo "screenshots: no @playwright/test in package-lock.json" >&2
  exit 1
fi
image="mcr.microsoft.com/playwright:v$version-noble"

if ! docker info >/dev/null 2>&1; then
  if command -v colima >/dev/null 2>&1; then
    colima start
  else
    echo "screenshots: docker is not running" >&2
    exit 1
  fi
fi

volume="pw-node-modules-$(basename "$root" | tr -c 'a-zA-Z0-9_.\n-' '-')"

tty=()
if [ -t 1 ]; then tty=(-t); fi

exec docker run --rm ${tty[@]+"${tty[@]}"} --init --ipc=host \
  -v "$root:/work" -v "$volume:/work/node_modules" -w /work \
  -e CI -e HOME=/tmp \
  "$image" bash -c '
    set -euo pipefail
    hash="$(sha256sum package-lock.json | cut -c1-16)"
    if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$hash" ]; then
      find node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} +
      npm ci --no-audit --no-fund
      echo "$hash" > node_modules/.lock-hash
    fi
    tools/worktree-env.sh >/dev/null
    npm run --silent screens:renderAll >/tmp/render.log 2>&1 || { cat /tmp/render.log; exit 1; }
    npm run --silent build >/tmp/build.log 2>&1 || { cat /tmp/build.log; exit 1; }
    npx playwright test "$@"
  ' bash "$@"
