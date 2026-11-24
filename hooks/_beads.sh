# Sourced by every hook in hooks/. `run_beads <hook> [args...]` runs the matching beads
# hook from .beads/hooks/ when it exists and is executable, and exits with its status
# when it fails. git runs hooks from the top of the working tree, so the path is relative.
run_beads() {
  _hook=".beads/hooks/$1"
  shift
  if [ -x "$_hook" ]; then
    "$_hook" "$@" || exit $?
  fi
}
