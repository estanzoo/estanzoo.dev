// Screenshot tests of every mock state and of the built site (owner decision 6).
// Run only through the Playwright Docker image, so baselines are Linux pixels:
//   npm run screenshots          compare against e2e/__screenshots__/
//   npm run screenshots:update   rewrite the baselines
// (tools/screenshots/docker.sh). Two projects: desktop 1440 and phone 390 wide.
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';
import { PROJECTS } from './tools/screenshots/shots';

const root = fileURLToPath(new URL('.', import.meta.url));
const previewPort = Number(loadEnv('', root, ['PREVIEW_PORT']).PREVIEW_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  // Baselines are Linux-only by construction, so the path carries no platform suffix.
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  outputDir: 'test-results',
  forbidOnly: !!process.env.CI,
  // A plain run never writes a baseline: a missing one fails. Only -u (screenshots:update) writes.
  updateSnapshots: 'none',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    baseURL: `http://localhost:${previewPort}`,
  },
  projects: PROJECTS.map((p) => ({
    name: p.name,
    use: { browserName: 'chromium', viewport: { width: p.width, height: p.height } },
  })),
  // The real built site for e2e/site.spec.ts (dist/ from npm run build).
  webServer: {
    command: 'npx vite preview',
    url: `http://localhost:${previewPort}/`,
    reuseExistingServer: false,
  },
});
