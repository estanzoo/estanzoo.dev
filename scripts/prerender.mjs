// Build step 3 of 3 (see `npm run build`): render the SSR bundle to HTML,
// inject it into dist/index.html at the <!--app--> marker, and delete the
// temporary SSR output so only dist/ ships.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const indexPath = `${root}dist/index.html`;
const ssrDir = `${root}dist-ssr`;
const MARKER = '<!--app-->';

try {
  const { render } = await import(pathToFileURL(`${ssrDir}/entry-server.js`).href);
  const html = await readFile(indexPath, 'utf8');
  const parts = html.split(MARKER);
  if (parts.length !== 2) throw new Error(`expected exactly one ${MARKER} marker in dist/index.html, found ${parts.length - 1}`);
  const app = render();
  if (!app) throw new Error('render() returned empty markup');
  await writeFile(indexPath, parts[0] + app + parts[1]);
  console.log(`prerendered dist/index.html (${(app.length / 1024).toFixed(1)} kB of markup)`);
} finally {
  await rm(ssrDir, { recursive: true, force: true });
}
