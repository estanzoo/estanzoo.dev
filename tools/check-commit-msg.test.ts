// Proves the commit-message rule (owner decision 7): a commit that touches src/ starts its
// subject with [SPEC] or [BUG]; every other commit passes; a merge commit passes; a failure
// prints a correct example.
// Leaves to other layers: reading the staged paths or a commit range from git (the CLI part
// of tools/check-commit-msg.ts, run by hooks/commit-msg and CI).
import { describe, expect, it } from 'vitest';
import { checkCommitMsg, subjectOf } from './check-commit-msg';

describe('checkCommitMsg', () => {
  it('rejects a src/ commit without a tag and shows correct examples', () => {
    const result = checkCommitMsg('tweak copy', ['src/content.ts']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('[SPEC] Add the projects filter');
    expect(result.message).toContain('[BUG] Keep the copy label after unmount');
    expect(result.message).toContain('tweak copy');
  });

  it('accepts [SPEC] and [BUG] subjects on a src/ commit', () => {
    expect(checkCommitMsg('[SPEC] Add the projects filter', ['src/App.tsx']).ok).toBe(true);
    expect(checkCommitMsg('[BUG] Keep the copy label after unmount', ['tools/x.ts', 'src/a/b.tsx']).ok).toBe(true);
  });

  it('needs the tag at the start, in capitals, with its brackets', () => {
    for (const subject of ['Add [SPEC] filter', '[spec] Add filter', 'SPEC: Add filter', '[FEAT] Add filter', ' [SPEC] Add filter']) {
      expect(checkCommitMsg(subject, ['src/App.tsx']).ok, subject).toBe(false);
    }
  });

  it('passes a commit that touches nothing under src/', () => {
    expect(checkCommitMsg('Add the commit hooks', ['tools/a.ts', 'hooks/pre-commit', 'srcx/a.ts', 'docs/src/a.md']).ok).toBe(true);
    expect(checkCommitMsg('Empty commit', []).ok).toBe(true);
  });

  it('passes a merge commit', () => {
    expect(checkCommitMsg("Merge branch 'feat/x' into feat/y", ['src/App.tsx']).ok).toBe(true);
  });
});

describe('subjectOf', () => {
  it('is the first line that is not a git comment', () => {
    expect(subjectOf('# Please enter the commit message\n\ntweak copy\n\nbody\n')).toBe('tweak copy');
    expect(subjectOf('[SPEC] Add x\r\n\r\nbody')).toBe('[SPEC] Add x');
  });
});
