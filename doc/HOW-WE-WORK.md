# How we work

Each task goes through the same stages. Each stage produces a committed file or a check result. Chat and memory hold no decisions.

```
 a task, already agreed and planned as a bead
        │
        ▼
 1. SCREENS ────── mocks of every state the task changes, on the task's branch
        │          skip when there is no UI change: the existing mocks then prove nothing broke
        ▼
 2. IMPLEMENTATION  worktree → tests first (red) → code (green) → refactor → commit
        │
        ▼
 3. GATES ──────── typecheck · unit tests · build (CI, every push and every PR)
        │
        ▼
 4. HANDS-ON CHECK by the owner with a checklist, on the running dev server
        │
        ▼
 5. MERGE ──────── the owner merges; CI runs the gates again on main
```

One branch and one pull request carry the screens and the code.

## 1. Task

A task is a bead (`bd show <id>`). It states what changes and what "done" means. The orchestrator owns the bead's status. When the build finds that the task is wrong, the change goes in a "Decisions" section of the PR, never into the code silently.

Branching:

- A task with no dependency branches from the epic's feature branch, never from `main`.
- A task with one dependency branches from that dependency's branch.
- A task with several dependencies starts from a merge of them.

## 2. Screens

The owner approves screens before the code. A screen is a mock: one JSON file per state, at `mocks/<section>/<state>.json`, drawn by the real View components in the screen renderer. A mock fits the section's typed view model. Together, the mocks of a section show every state its types allow.

The screen renderer arrives with a later task. Until then the design source of truth is `docs/design/Panes.dc.html`.

## 3. Implementation (test-driven)

Work in your own worktree. For each behaviour:

1. Write the test. Run it and see it fail (**red**). Keep the command and the first failure line.
2. Write the code. Run the test and see it pass (**green**).
3. Refactor only on green.

While coding, run only the changed test files (`npx vitest run <file>`). For a bug, the first test reproduces the bug. For a UI change, the view model and its mocks come first.

Commit with the prefix rule in `AGENTS.md`.

## 4. Gates

Run the full gates once, at the end, and report each command with its exit status:

```bash
npm run typecheck
npm test
npm run build
```

CI runs the same commands on every push and every pull request. Later tasks add lint rules, markup pins and screenshots; each one becomes a gate when it lands.

## 5. Owner hands-on check

The agent leaves the dev server up (`npm run dev`) and hands over a numbered checklist: for each step the URL, what to do, and the expected result. The owner does the check. Agents do not impersonate the owner or improvise test setups.

The PR body holds:

- **Summary**: what changed.
- **Evidence**: the "Before" red run (command and first failure line) and the "After" gate results.
- **Decisions**: any change to the agreed task or screens.
- **Checklist**: the hands-on steps.

## 6. Merge

The owner merges to `main`. After a merge, each open PR that can interact with it (same section, shared types, build or CI files) is rebased and its gates run again.
