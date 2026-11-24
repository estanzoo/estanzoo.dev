import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { portOptions } from './tools/dev-ports';

const root = fileURLToPath(new URL('.', import.meta.url));
const env = loadEnv('', root, ['DEV_PORT', 'PREVIEW_PORT']);

export default defineConfig({
  plugins: [react()],
  ...portOptions(env),
});
