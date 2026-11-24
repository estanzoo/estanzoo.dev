#!/usr/bin/env bash
# Render every mock at a base commit and in the working tree, and compare (blueprint R9).
#
#   tools/render-diff.sh [base]          npm run render:diff -- [base]
#
# base defaults to $(git merge-base HEAD main). The base renders in a temporary worktree
# (after npm ci there); the working tree renders as it is, so uncommitted changes count.
# Checkout paths in the output become static: so identical pages compare equal.
#
# Exit 0 no page changed | 1 pages changed (listed) | 2 a side cannot render, or the base
# has no screens:renderAll (the message names the side).
# KEEP=1 keeps both output folders and prints their paths.
# Works from any directory inside any checkout. A trap always removes the temporary
# worktree and temp folders. Builds go through build-slot when it is installed.
set -euo pipefail

say() { echo "render-diff: $*" >&2; }

root="$(git rev-parse --show-toplevel)"
root="$(cd "$root" && pwd -P)"
cd "$root"
base="$(git rev-parse --verify "${1:-$(git merge-base HEAD main)}^{commit}")"

work="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/render-diff.XXXXXX")" && pwd -P)"
checkout="$work/base-checkout"

cleanup() {
  if [ -d "$checkout" ]; then
    git -C "$root" worktree remove --force "$checkout" >/dev/null 2>&1 || true
  fi
  git -C "$root" worktree prune >/dev/null 2>&1 || true
  if [ "${KEEP:-}" = 1 ] && [ -d "$work/base" ]; then
    rm -rf "$checkout"
    echo "kept base: $work/base"
    echo "kept tree: $work/tree"
  else
    rm -rf "$work"
  fi
}
trap cleanup EXIT

slot() {
  if command -v build-slot >/dev/null 2>&1; then
    build-slot render-diff -- "$@"
  else
    "$@"
  fi
}

# Replace the checkout path (as text) with static: in every file under $1.
strip_paths() {
  local dir="$1" path="$2"
  find "$dir" -type f -print0 | CHECKOUT="$path" xargs -0 perl -pi -e 's/\Q$ENV{CHECKOUT}\E/static:/g'
}

# render <checkout> <out> <side name>: renderAll in <checkout>, copy build/screens to <out>.
render() {
  local dir="$1" out="$2" side="$3" log="$work/$4.log"
  rm -rf "$dir/build/screens"
  if ! (cd "$dir" && slot npm run --silent screens:renderAll) >"$log" 2>&1; then
    say "cannot render $side"
    CHECKOUT="$dir" perl -ne 's/\Q$ENV{CHECKOUT}\E/static:/g; print if /cannot render|error/i' "$log" >&2
    exit 2
  fi
  mkdir -p "$out"
  if [ -d "$dir/build/screens" ]; then
    cp -R "$dir/build/screens/." "$out/"
    strip_paths "$out" "$dir"
  fi
}

echo "render-diff: base $base"
git worktree add --detach "$checkout" "$base" >/dev/null 2>&1
if ! (cd "$checkout" && node -e 'process.exit(require("./package.json").scripts?.["screens:renderAll"] ? 0 : 1)') 2>/dev/null; then
  say "the base ($(git rev-parse --short "$base")) has no screens:renderAll"
  exit 2
fi
if ! (cd "$checkout" && slot npm ci --no-audit --no-fund) >"$work/install.log" 2>&1; then
  say "npm ci failed at the base"
  tail -5 "$work/install.log" >&2
  exit 2
fi

render "$checkout" "$work/base" "the base" base
render "$root" "$work/tree" "the working tree" tree

if diff -rq "$work/base" "$work/tree" >"$work/diff.txt"; then
  echo "render-diff: no page changed"
  exit 0
fi
B="$work/base" T="$work/tree" perl -ne '
  BEGIN { ($b, $t) = @ENV{qw(B T)} }
  if (/^Files \Q$b\E\/(.+)\.html and /) { print "changed: $1\n" }
  elsif (/^Only in \Q$b\E\/?(.*): (.+)\.html$/) { print "removed: ", ($1 ? "$1/" : ""), "$2\n" }
  elsif (/^Only in \Q$t\E\/?(.*): (.+)\.html$/) { print "added: ", ($1 ? "$1/" : ""), "$2\n" }
  else { print }
' "$work/diff.txt"
exit 1
