// The commit-message rule (owner decision 7): a commit that touches src/ starts its subject
// with [SPEC] (a spec change or a feature) or [BUG] (a bug fix). Other commits use a short
// plain subject. Merge commits pass.
//
//   node tools/check-commit-msg.ts <message-file>      the staged paths (hooks/commit-msg)
//   node tools/check-commit-msg.ts --commits <rev>...  every commit `git rev-list <rev>...`
//                                                       lists, e.g. A..B or B --not origin/main (CI)
//
// The --commits mode skips a commit whose own tree has no tools/check-commit-msg.ts: the
// rule applies from the commit that introduced it, not to the history before it.
//
// Exits 1 and prints a correct example when a commit breaks the rule.
// Limit: the hook sees the staged paths only, so `git commit --amend` with nothing staged
// is checked as if it touched nothing. CI checks the real commit.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const RULE_FILE = 'tools/check-commit-msg.ts';
const TAGGED = /^\[(SPEC|BUG)\] /;

export type CommitCheck = { ok: true } | { ok: false; message: string };

/** Whether a commit with this subject and these changed paths follows the rule. */
export function checkCommitMsg(subject: string, paths: string[]): CommitCheck {
  if (subject.startsWith('Merge ')) return { ok: true };
  if (!paths.some((p) => p.startsWith('src/'))) return { ok: true };
  if (TAGGED.test(subject)) return { ok: true };
  return {
    ok: false,
    message: [
      `This commit touches src/, so its subject must start with [SPEC] or [BUG]:`,
      `  got:  ${subject}`,
      `  e.g.  [SPEC] Add the projects filter`,
      `        [BUG] Keep the copy label after unmount`,
      `[SPEC] is a spec change or a feature, [BUG] a bug fix.`,
    ].join('\n'),
  };
}

/** The subject of a commit message as git hands it to commit-msg: the first non-comment line. */
export function subjectOf(message: string): string {
  return (
    message
      .split(/\r?\n/)
      .find((line) => line.trim() !== '' && !line.startsWith('#'))
      ?.trimEnd() ?? ''
  );
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function lines(out: string, sep = '\n'): string[] {
  return out.split(sep).filter(Boolean);
}

if (import.meta.main) {
  const [first, ...rest] = process.argv.slice(2);
  const failures: string[] = [];
  if (first === '--commits') {
    for (const sha of lines(git(['rev-list', '--reverse', ...rest]))) {
      if (git(['ls-tree', '--name-only', sha, '--', RULE_FILE]).trim() === '') continue;
      const subject = git(['log', '-1', '--format=%s', sha]).trimEnd();
      const paths = lines(git(['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', '--root', sha]), '\0');
      const result = checkCommitMsg(subject, paths);
      if (!result.ok) failures.push(`${sha.slice(0, 10)}: ${result.message}`);
    }
  } else if (first) {
    const staged = lines(git(['diff', '--cached', '--name-only', '-z']), '\0');
    const result = checkCommitMsg(subjectOf(readFileSync(first, 'utf8')), staged);
    if (!result.ok) failures.push(result.message);
  } else {
    console.error('usage: check-commit-msg.ts <message-file> | --commits <rev>...');
    process.exit(2);
  }
  for (const f of failures) console.error(f);
  process.exit(failures.length === 0 ? 0 : 1);
}
