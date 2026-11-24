// Renders public/og.png (1200x630) for Open Graph / Twitter cards.
//
// Fonts: resvg needs TTF/OTF, but @fontsource only ships woff/woff2. The
// .woff (WOFF 1.0) files are just zlib-compressed sfnt tables, so we unpack
// them back to TTF in a temp dir with node:zlib. No network, no extra deps.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// content.ts has no imports, so Node's built-in type stripping (>= 22.18) loads it directly.
const { site } = await import(join(root, 'src/content.ts'));

const W = 1200;
const H = 630;
const C = {
  bg: '#0B0E12',
  line: '#2A313C',
  text: '#E6E8EB',
  muted: '#9AA4B2',
  amber: '#FFB454',
  green: '#7EE787',
};

/** Convert a WOFF 1.0 buffer to a TTF/OTF buffer. */
function woffToSfnt(woff) {
  if (woff.toString('ascii', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 file');
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const p = 44 + i * 20;
    const offset = woff.readUInt32BE(p + 4);
    const compLength = woff.readUInt32BE(p + 8);
    const origLength = woff.readUInt32BE(p + 12);
    const raw = woff.subarray(offset, offset + compLength);
    tables.push({
      tag: woff.subarray(p, p + 4),
      checksum: woff.readUInt32BE(p + 16),
      data: compLength < origLength ? inflateSync(raw) : raw,
    });
  }
  const pad4 = (n) => (n + 3) & ~3;
  const headerLen = 12 + 16 * numTables;
  const total = tables.reduce((n, t) => n + pad4(t.data.length), headerLen);
  const out = Buffer.alloc(total);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  out.writeUInt32BE(flavor, 0);
  out.writeUInt16BE(numTables, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(entrySelector, 8);
  out.writeUInt16BE(numTables * 16 - searchRange, 10);
  let offset = headerLen;
  tables.forEach((t, i) => {
    const p = 12 + i * 16;
    t.tag.copy(out, p);
    out.writeUInt32BE(t.checksum, p + 4);
    out.writeUInt32BE(offset, p + 8);
    out.writeUInt32BE(t.data.length, p + 12);
    t.data.copy(out, offset);
    offset += pad4(t.data.length);
  });
  return out;
}

const FONTS = [
  ['space-grotesk', 'latin-700-normal'],
  ['inter', 'latin-400-normal'],
  ['jetbrains-mono', 'latin-400-normal'],
  ['jetbrains-mono', 'latin-500-normal'],
];

/** Greedy word wrap by an approximate character budget. */
function wrap(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const [first, ...rest] = site.name.split(' ');
const last = rest.join(' ');
const PAD = 72;
const BAR = 64;
const tagline = wrap(site.tagline, 70);
const taglineY = 390;
const taglineLh = 44;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="14" cy="14" r="1.6" fill="${C.amber}"/>
    </pattern>
    <radialGradient id="fade" cx="78%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.12"/>
    </radialGradient>
    <mask id="dotmask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect y="${BAR}" width="${W}" height="${H - BAR}" fill="url(#dots)" mask="url(#dotmask)"/>

  <!-- window bar -->
  <rect width="${W}" height="${BAR}" fill="${C.bg}"/>
  <line x1="0" y1="${BAR - 0.5}" x2="${W}" y2="${BAR - 0.5}" stroke="${C.line}"/>
  <text x="${PAD}" y="${BAR / 2 + 7}" font-family="JetBrains Mono" font-weight="400" font-size="20" fill="${C.muted}">hq · session: portfolio</text>
  <circle cx="${W - PAD - 108}" cy="${BAR / 2}" r="6" fill="${C.green}"/>
  <text x="${W - PAD}" y="${BAR / 2 + 7}" text-anchor="end" font-family="JetBrains Mono" font-weight="400" font-size="20" fill="${C.muted}">3 panes</text>

  <!-- name -->
  <text x="${PAD - 6}" y="292" font-family="Space Grotesk" font-weight="700" font-size="164" letter-spacing="-4"><tspan fill="${C.text}">${esc(first)}</tspan> <tspan fill="${C.amber}">${esc(last)}</tspan></text>

  <!-- tagline -->
  <text font-family="Inter" font-weight="400" font-size="30" fill="${C.muted}">
    ${tagline.map((l, i) => `<tspan x="${PAD}" y="${taglineY + i * taglineLh}">${esc(l)}</tspan>`).join('\n    ')}
  </text>

  <!-- footer -->
  <text x="${PAD}" y="${H - 64}" font-family="JetBrains Mono" font-weight="500" font-size="26" fill="${C.text}"><tspan fill="${C.amber}">~/</tspan>estanzoo.dev</text>
</svg>`;

const tmp = mkdtempSync(join(tmpdir(), 'og-fonts-'));
try {
  const fontFiles = FONTS.map(([pkg, variant]) => {
    const woff = readFileSync(join(root, 'node_modules/@fontsource', pkg, 'files', `${pkg}-${variant}.woff`));
    const file = join(tmp, `${pkg}-${variant}.ttf`);
    writeFileSync(file, woffToSfnt(woff));
    return file;
  });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
  const out = join(root, 'public/og.png');
  writeFileSync(out, png);
  console.log(`wrote ${out} (${(png.length / 1024).toFixed(1)} KiB)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
