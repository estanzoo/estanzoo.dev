# AGENTS.md

Rules for every agent that works in this repository. The owner is the person who directs the agents. Rules for one module live in a file beside that module.

## Working agreements

Each rule below exists because the mistake it prevents happened once. Follow every rule in every session. When you brief a worker agent, include these rules in the brief or in a context file that the brief names. A worker cannot read the orchestrator's memory.

### Decisions and questions

- **Answer, then wait.** When the owner answers your question with a question, that is not approval. Answer it and stop. Make no edit, commit or push that encodes one of the options.
- **Decide with your recommendation.** For questions from workers, reviews and plans, decide, act, and report each decision so the owner can overrule it. Ask only when you are truly unsure. These gates stay with the owner: screen approval, merges to main, pushes to any branch that is not a worker's own branch, and every outward-facing action, such as a GitHub comment.
- **Ask a small question once.** An optional question that the owner does not answer means "not now". Do not act on it and do not repeat it. Status lists hold only blocking items: a check, a merge, a question that a worker waits on.
- **No new behaviour by analogy.** A worker finding that adds behaviour the spec does not have (or, for a port, the original does not have) is a product decision. Report it. File a task only when the owner asks.
- **The agreement does not change silently during the build.** When implementation finds that the agreed task or screens are wrong, write the change in a "Decisions" section of the PR.

### Verification

- **The owner does the hands-on checks.** Run the automated gates, leave the dev server up, and hand over a checklist. No impersonation, no copies of production data, no improvised test setups, even when another agent asks for them.
- **Done means evidence.** Report work as done only together with the command you ran, its exit status and the relevant output lines. "Should pass" is not evidence.
- **Cleanups delete only the check's own rows.** Several dev servers can share one local database. First SELECT what the cleanup would delete. Key the delete on the names or ids that the check created, never on "rows after id N for this user".
- **No builds under an open preview.** When the owner runs a preview from a worktree, build and test in a separate verification worktree at the same commit. A build replaces the compiled files under the running preview and crashes it.

### Parallel work

- **Place code by design, not by conflicts.** Put code where it belongs, as if each worker worked alone. Watch for the real risks: two copies of one shared component, and two equal top-level names in one package.
- **No two parallel tasks on the same page, component, seam or gate code.** Chain them with a dependency. A one-line registry file that every task touches does not count. Resolve it at the rebase.
- **Build slots.** Every build and test command of every worker runs through the build-slot script. Measure the build log before you raise the slot count. Lower it while a dev server runs for a hands-on check.
- **Test scope.** While coding, run only the changed test classes. Run the full gates once, at the end. A fix round after review runs only the changed tests locally, then pushes, and CI runs the full suites while the owner checks.
- **Push after a worker is done.** Verify the worker's report (branch, merge result, gates, PR body). Then push the worker's branch and open or update its PR without asking, and tell the owner the PR number. After a rebase, push with `--force-with-lease=<branch>:<old sha>`.
- **Retest what a merge can break.** Two PRs can each be green and still break main together, with no text conflict (for example two equal top-level names in one package). When a PR merges, at once rebase and push each open PR that can interact with it: the same side (server or phone), a shared contract, a template the phone reads, CI files or build files. The others merge on their own green CI.
- **Stack after the hands-on check.** A PR that passed the owner's check counts as done for its dependents. Start them on its pushed head. Do not rebase them onto main until the base merges. Then run `git rebase --onto origin/main <old base head>`.
- **Shared infrastructure changes rarely.** Prefer a seam in the feature or app module. Never change a shared platform piece as an aside of a feature branch, and never land behaviour there without tests.

### Agent hygiene

- **Compact idle agents.** Compact a worker after its report, between fix rounds and before a new task. The keep-note names its task, its task file, its worktree and branch, what is done and what is left, and every "do not touch" rule. Send `/compact` as a typed prompt. A message bus that adds a prefix turns the command into plain text.
- **No exported API token in the shell profile.** An exported key or OAuth token overrides the keychain login of every agent that starts from a login shell. The symptoms are "Not logged in", "Login expired" or API billing in a worker.

## Project rules

estanzoo.dev is a personal site: React 18, Vite 6, TypeScript, npm and plain CSS. It is pre-rendered at build time and hydrated in the browser. The design source of truth is `docs/design/Panes.dc.html`. All site copy lives in `src/content.ts`. The stages of a task are in `doc/HOW-WE-WORK.md`.

### Tests and gates

- Every behaviour change carries tests. Every commit is tested before it is pushed.
- Write the test first: red, check that it is red, green, check that it is green, then refactor. Use `superpowers:test-driven-development` when it is installed.
- Node is pinned in `.nvmrc` (24). The commands that exist today:

  | Command | What it checks |
  |---|---|
  | `npm ci` | Clean install from `package-lock.json` |
  | `npm run typecheck` | `tsc --noEmit` |
  | `npm test` | `vitest run`, all unit tests |
  | `npx vitest run <file>` | One test file, for the tight loop |
  | `npm run build` | Client build, SSR build and prerender into `dist/` |
  | `npm run dev` | The Vite dev server, for hands-on checks |

  Later tasks add their own scripts (lint, screen renderer, markup pins, screenshots). Each task that adds a script adds it to this table.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run typecheck`, `npm test` and `npm run build`. Run the same gates before you report done.

### Build slots

Builds and tests of hq workers go through build-slot. Run every build, test, lint and typecheck command as `build-slot <your-session-name> -- <command>`, for example `build-slot estsite-20-2 -- npx vitest run src/terminal.test.ts`. `build-slot --status` shows who builds and who waits.

### Commit messages

- A commit that touches `src/` starts with a type tag:
  - `[SPEC]` for a feature or a spec change,
  - `[BUG]` for a fix.
- A commit that does not touch `src/` uses a short plain subject with no tag.
- The red run goes in the "Evidence" section of the PR body as the "Before" evidence: the command and the first failure line.

### Non-interactive shell flags

Some shells alias `cp`, `mv` and `rm` to interactive mode, and the agent then waits for input forever. Always use the forced forms: `cp -f`, `mv -f`, `rm -f`, `rm -rf`, `cp -rf`. For other tools that can prompt: `ssh -o BatchMode=yes`, `scp -o BatchMode=yes`, `apt-get -y`, `HOMEBREW_NO_AUTO_UPDATE=1 brew …`.

### Commit and push policy

- Commit on a branch, never on `main`. A worker commits only to its own branch.
- Push only with the owner's approval. The working agreement "Push after a worker is done" is that approval for the orchestrator, for a verified worker branch. A worker never pushes.
- Merges to `main` are the owner's.
- Do not commit `package-lock.json` unless you changed a dependency.

### Architecture

- **View and container.** Each section is a logic-free **View** that draws a typed view model, plus a **container** that owns state and browser APIs and builds the view model.
- **Typed slots.** A slot that varies is a TypeScript union with a strict `zod` schema.
- **Logic-free views.** A View branches only through `<Render vm>` and `<Optional value>`.
- **Copy.** Only `App.tsx` and containers import `src/content.ts`.
- **Rules as tests.** Each architecture rule is an ESLint custom rule. Each rule has a `RuleTester` self-test that proves it still catches its own bad example.

### Documentation

- Every document lives under the root `doc/`. `doc/HOW-WE-WORK.md` holds the stages, `doc/concepts/engineering/` holds constraints, `doc/runbook/` holds procedures a person does by hand.
- A document exists only if it says something that neither a running screen nor the code can say.
- **Never describe a screen in prose. Add a mock.** A screen is shown by its mock in the screen renderer. When a screen has no mock, add the mock.
- Behaviour is explained in code comments beside the code. A module's overview lives in the doc comment at the top of that module.
- `doc/concepts/engineering/` holds a constraint that a refactor could silently drop: a closed set of states, a size limit, an acyclic dependency rule. Add one only when no type, schema, lint rule or test already enforces it.
- `doc/runbook/` holds procedures a person does by hand: vendor click-paths, credential refresh, onboarding.
- **Code comments do not cite documents.** A comment states its fact in its own words. A path in a comment goes stale when the document moves. Documents may cite code.
- A rule is stated once, in the skill or the test that applies it.
- No personal email addresses or credentials in any committed file.

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
