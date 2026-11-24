// Screen renderer CLI (blueprint Step 7, R5; owner decision 4). Renders the real section
// Views from mocks/<section>/<state>.json through Vite SSR: no app, no other process.
//
//   node tools/screens/cli.mjs serve            npm run screens
//     Scenario index at http://localhost:$SCREENS_PORT/ (port from .env, written by
//     tools/worktree-env.sh). Each state at /<section>/<state>. Every request reads the
//     mock and the Views again, so an edit shows on reload. The CSS comes from the Vite
//     dev server (src/screens/styles.ts), in the real page's cascade order.
//   node tools/screens/cli.mjs list             npm run screens:list
//   node tools/screens/cli.mjs render <s>/<st>  npm run screens:render -- contact/idle
//   node tools/screens/cli.mjs renderAll        npm run screens:renderAll
//     Write build/screens/<section>/<state>.html: standalone pages with the production
//     CSS of src/screens/styles.ts inlined (fonts as data URIs), for render-diff and
//     screenshots. Exits 1 and names each mock that cannot render.
//
// The logic lives in tools/screens/screens.ts (unit-tested); this file only wires it to
// Vite, the file system and HTTP.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer, loadEnv } from 'vite';

const root = fileURLToPath(new URL('../..', import.meta.url));
const MOCKS = join(root, 'mocks');
const OUT = join(root, 'build/screens');
const STYLES = '/src/screens/styles.ts';

const [command, arg] = process.argv.slice(2);
const commands = { serve, list, render, renderAll };

if (!(command in commands)) {
  console.error('usage: cli.mjs serve | list | render <section>/<state> | renderAll');
  process.exit(2);
}
process.chdir(root);
await commands[command](arg);

/** A Vite server without its own port, used to load the renderer and the Views via SSR. */
function viteServer(hmr) {
  return createServer({
    root,
    logLevel: 'warn',
    appType: 'custom',
    server: { middlewareMode: true, hmr, watch: hmr ? undefined : null },
  });
}

async function load(vite) {
  const lib = await vite.ssrLoadModule('/tools/screens/screens.ts');
  const { screens } = await vite.ssrLoadModule('/src/screens/registry.ts');
  return { lib, screens };
}

/** The production CSS of src/screens/styles.ts, every asset inlined. */
async function productionCss() {
  const output = await build({
    root,
    logLevel: 'silent',
    build: {
      write: false,
      assetsInlineLimit: () => true,
      rollupOptions: { input: join(root, STYLES) },
    },
  });
  const assets = (Array.isArray(output) ? output : [output]).flatMap((o) => o.output);
  const css = assets.filter((a) => a.fileName.endsWith('.css'));
  if (css.length !== 1) throw new Error(`expected one CSS file from ${STYLES}, got ${css.length}`);
  return String(css[0].source);
}

async function list() {
  const vite = await viteServer(false);
  try {
    const { lib } = await load(vite);
    for (const ref of lib.listMocks(MOCKS)) {
      const scenario = lib.loadMock(MOCKS, ref)._scenario;
      console.log(`${ref.name}\t${scenario ?? ''}`);
    }
  } finally {
    await vite.close();
  }
}

async function render(name) {
  if (!name) {
    console.error('usage: npm run screens:render -- <section>/<state>');
    process.exit(2);
  }
  await writePages((refs) => {
    const ref = refs.find((r) => r.name === name);
    if (!ref) throw new Error(`mocks/${name}.json: no such mock`);
    return [ref];
  });
}

async function renderAll() {
  await writePages((refs) => refs);
}

async function writePages(pick) {
  const vite = await viteServer(false);
  let failed = 0;
  try {
    const { lib, screens } = await load(vite);
    const refs = pick(lib.listMocks(MOCKS));
    const head = `<style>\n${await productionCss()}</style>`;
    for (const ref of refs) {
      try {
        const body = lib.renderMock(screens, ref, lib.loadMock(MOCKS, ref));
        const file = join(OUT, `${ref.name}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, lib.statePage({ title: ref.name, head, body }));
        console.log(`wrote ${file.slice(root.length)}`);
      } catch (error) {
        failed++;
        console.error(`cannot render: ${error.message}`);
      }
    }
  } catch (error) {
    failed++;
    console.error(error.message);
  } finally {
    await vite.close();
  }
  if (failed) process.exit(1);
}

async function serve() {
  const env = loadEnv('', root, ['SCREENS_PORT']);
  const port = Number(env.SCREENS_PORT);
  if (!port) {
    console.error('screens: no SCREENS_PORT in .env; run tools/worktree-env.sh');
    process.exit(1);
  }
  const http = createHttpServer();
  const vite = await viteServer({ server: http });
  const head = `<script type="module" src="/@vite/client"></script>
    <script type="module" src="${STYLES}"></script>`;

  http.on('request', async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/+$/, '');
    try {
      const { lib, screens } = await load(vite);
      const refs = lib.listMocks(MOCKS);
      if (path === '') {
        const entries = refs.map((ref) => ({ ref, scenario: lib.loadMock(MOCKS, ref)._scenario }));
        return send(res, 200, lib.indexPage(entries));
      }
      const ref = refs.find((r) => `/${r.name}` === path);
      if (ref) {
        const body = lib.renderMock(screens, ref, lib.loadMock(MOCKS, ref));
        return send(res, 200, lib.statePage({ title: ref.name, head, body }));
      }
    } catch (error) {
      vite.ssrFixStacktrace(error);
      return send(res, 500, `<pre>${String(error.message).replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</pre>`);
    }
    vite.middlewares(req, res, () => send(res, 404, 'not found'));
  });

  http.on('error', (error) => {
    console.error(`screens: cannot listen on port ${port}: ${error.message}`);
    process.exit(1);
  });
  http.listen(port, () => console.log(`screens: http://localhost:${port}/`));
}

function send(res, status, html) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}
