import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type ParentNode = DefaultTreeAdapterMap['parentNode'];
type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];

/** HTML's own whitespace. Not \s, which also matches a no-break space the reader can see. */
const WHITESPACE = /[ \t\n\f\r]+/g;
const RAW_TEXT = new Set(['script', 'style']);
const INDENT = '  ';

/**
 * Normalize HTML into a markup pin record (blueprint R8): one node per line, indented by
 * depth, so that only a meaningful change in the markup changes the record.
 */
export function normalizeMarkup(html: string): string {
  const lines: string[] = [];
  writeChildren(parseFragment(html), 0, lines);
  return lines.join('\n');
}

function writeChildren(parent: ParentNode, depth: number, lines: string[]): void {
  // Comments are dropped, so the text runs on either side of one join into one run.
  let text = '';
  const flushText = () => {
    const collapsed = text.replace(WHITESPACE, ' ').trim();
    if (collapsed) lines.push(INDENT.repeat(depth) + collapsed);
    text = '';
  };
  for (const node of parent.childNodes as ChildNode[]) {
    if (node.nodeName === '#comment') continue;
    if (node.nodeName === '#text') {
      text += (node as DefaultTreeAdapterMap['textNode']).value;
      continue;
    }
    if (node.nodeName === '#documentType') continue;
    flushText();
    writeElement(node as Element, depth, lines);
  }
  flushText();
}

function writeElement(el: Element, depth: number, lines: string[]): void {
  lines.push(INDENT.repeat(depth) + startTag(el));
  if (RAW_TEXT.has(el.tagName)) {
    const body = rawTextBody(el);
    if (body) lines.push(INDENT.repeat(depth + 1) + body);
    return;
  }
  writeChildren(el, depth + 1, lines);
}

function startTag(el: Element): string {
  const attrs = [...el.attrs]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(({ name, value }) => {
      const normalized = name === 'class' ? value.split(WHITESPACE).filter(Boolean).sort().join(' ') : value;
      return ` ${name}="${escapeAttribute(normalized)}"`;
    });
  return `<${el.tagName}${attrs.join('')}>`;
}

/** parse5 has already unescaped the value; escaping it again gives every spelling one form. */
function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** A one-line body verbatim; a longer one as a digest of its trimmed non-blank lines. */
function rawTextBody(el: Element): string {
  const source = (el.childNodes as ChildNode[])
    .map((n) => (n.nodeName === '#text' ? (n as DefaultTreeAdapterMap['textNode']).value : ''))
    .join('');
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines[0] ?? '';
  const digest = createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
  return `[${lines.length} lines, sha256 ${digest}]`;
}

const CONTEXT = 5;

/** The first differing line of two records, with five lines of context from each side. */
export function firstDifference(expected: string, actual: string): string | null {
  if (expected === actual) return null;
  const want = expected.split('\n');
  const got = actual.split('\n');
  let at = 0;
  while (at < want.length && at < got.length && want[at] === got[at]) at++;
  const excerpt = (lines: string[]) => {
    const out: string[] = [];
    for (let i = Math.max(0, at - CONTEXT); i <= at + CONTEXT && i < lines.length; i++) {
      out.push(`${i === at ? '>' : ' '}${String(i + 1).padStart(5)} | ${lines[i]}`);
    }
    return out;
  };
  return [`first difference at line ${at + 1}`, '--- expected', ...excerpt(want), '+++ actual', ...excerpt(got)].join('\n');
}

/**
 * Compare a record with its committed pin at <pinDir>/<section>.txt. On a mismatch, write
 * the actual record to <outDir>/<test>/<section>.txt and return the failure message.
 * In update mode, rewrite the committed pin instead.
 */
export function checkPin(opts: {
  test: string;
  section: string;
  actual: string;
  pinDir: string;
  outDir: string;
  update?: boolean;
}): string | null {
  const { test, section, actual, pinDir, outDir, update } = opts;
  const pinPath = join(pinDir, `${section}.txt`);
  if (update) {
    writeRecord(pinPath, actual);
    return null;
  }
  const expected = existsSync(pinPath) ? readFileSync(pinPath, 'utf8').replace(/\n$/, '') : null;
  if (expected === actual) return null;
  const actualPath = join(outDir, test, `${section}.txt`);
  writeRecord(actualPath, actual);
  const head =
    expected === null
      ? `markup pin "${section}" has no committed record at ${pinPath}. Create it with npm run pins:update.`
      : `markup pin "${section}" differs from ${pinPath}. If the change is deliberate, run npm run pins:update.`;
  return [head, `actual record: ${actualPath}`, firstDifference(expected ?? '', actual)].join('\n');
}

function writeRecord(path: string, record: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, record + '\n');
}
