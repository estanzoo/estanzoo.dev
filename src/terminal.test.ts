import { describe, expect, it } from 'vitest';
import { runCommand } from './terminal';
import { site } from './content';

describe('runCommand', () => {
  it('ignores empty and whitespace input', () => {
    expect(runCommand('')).toBeNull();
    expect(runCommand('   ')).toBeNull();
  });

  it('help lists every command and echoes the input', () => {
    const r = runCommand('help')!;
    expect(r.lines[0]).toEqual({ kind: 'cmd', text: '$ help' });
    for (const cmd of ['whoami', 'projects', 'experience', 'interests', 'stack', 'contact', 'clear', 'replay']) {
      expect(r.lines[1].text).toContain(cmd);
    }
    expect(r.effects).toEqual([]);
  });

  it('is case-insensitive and trims, but echoes what was typed', () => {
    const r = runCommand('  HELP ')!;
    expect(r.lines[0].text).toBe('$ HELP');
    expect(r.lines[1].kind).toBe('out');
  });

  it('projects and experience dispatch the matching agent', () => {
    expect(runCommand('projects')!.effects).toEqual([{ type: 'dispatch', agent: 1 }]);
    expect(runCommand('experience')!.effects).toEqual([{ type: 'dispatch', agent: 2 }]);
  });

  it('whoami rescrambles the name', () => {
    expect(runCommand('whoami')!.effects).toEqual([{ type: 'scramble' }]);
  });

  it('stack prints languages in the configured order', () => {
    expect(runCommand('stack')!.lines[1].text).toBe('c++ · java · python · c · typescript · elixir · swift · scala · sql');
  });

  it('contact and sudo link to the public email', () => {
    expect(runCommand('contact')!.lines[1]).toMatchObject({ href: 'mailto:' + site.email, linkText: site.email });
    const sudo = runCommand('sudo hire ethan')!;
    expect(sudo.lines[1]).toMatchObject({ kind: 'ok', href: 'mailto:' + site.email });
  });

  it('clear and replay produce no echo, only an effect', () => {
    expect(runCommand('clear')).toEqual({ lines: [], effects: [{ type: 'clear' }] });
    expect(runCommand('replay')).toEqual({ lines: [], effects: [{ type: 'replay' }] });
  });

  it('unknown commands report an error with truncated input', () => {
    const r = runCommand('rm -rf / --no-preserve-root please')!;
    expect(r.lines[1].kind).toBe('err');
    expect(r.lines[1].text).toBe('command not found: rm -rf / --no-preserve-r · try help');
  });
});
