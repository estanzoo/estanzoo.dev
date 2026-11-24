---
name: dev-server
description: Starts this checkout's Vite dev server on its own port and opens it in the browser. TRIGGER when you run the site locally, start or restart the dev server, need its URL, or leave the app up for a hands-on check. NOT for the production build (`npm run build`), `vite preview`, tests, or a server of another checkout.
argument-hint: (no arguments)
allowed-tools: Bash
---

# dev-server

Each checkout has its own ports in its `.env` (written by `tools/worktree-env.sh`, blueprint R1). Vite reads `DEV_PORT` from it with `strictPort`, so this checkout's server lives on one fixed port. Other checkouts run their own servers on their own ports at the same time. Act only on this checkout's port and this checkout's process.

Run every command from the checkout root: `cd "$(git rev-parse --show-toplevel)"`.

## Steps

1. **Ports.** Run `tools/worktree-env.sh`. It keeps an existing `.env` and prints it. Done when you have the `DEV_PORT` value from its output.

2. **Reuse check.** Find the process that listens on `DEV_PORT`:

   ```bash
   lsof -nP -iTCP:"$DEV_PORT" -sTCP:LISTEN -t
   ```

   - No process: go to step 3.
   - A process: read its working directory with `lsof -a -p <pid> -d cwd -Fn`. When it is this checkout root, the server already runs: go to step 5. When it is anything else, stop and report the pid and its directory. Leave that process running; it belongs to someone else.

   Done when you know which of the three cases holds.

3. **Start.** Start the server detached, with its output in `.dev-server.log` (ignored by git through `*.log`):

   ```bash
   nohup npm run dev > .dev-server.log 2>&1 &
   ```

   Done when the command returns.

4. **Ready.** Wait until Vite prints its ready line (`VITE v… ready in … ms`), at most 60 seconds:

   ```bash
   for i in $(seq 120); do grep -q 'ready in' .dev-server.log && break; sleep 0.5; done; cat .dev-server.log
   ```

   Done when the log shows the ready line and a `Local:` URL on `DEV_PORT`. When it shows an error instead (for example `Port … is already in use`), stop and report the log.

5. **Open.** Open `http://localhost:$DEV_PORT/` in the browser: `open` on macOS, `xdg-open` on Linux. Done when the command exits 0.

6. **Report.** Give the URL, the pid, and whether you started the server or reused a running one. Leave the server running.
