// Dev and preview ports for vite.config.ts. tools/worktree-env.sh writes them
// to the checkout's .env. Without them, Vite's own defaults apply.
// strictPort: a busy port is an error, never a silent move to another
// checkout's port.
export function portOptions(env: Record<string, string | undefined>) {
  return {
    server: { port: Number(env.DEV_PORT ?? 5173), strictPort: true },
    preview: { port: Number(env.PREVIEW_PORT ?? 4173), strictPort: true },
  };
}
