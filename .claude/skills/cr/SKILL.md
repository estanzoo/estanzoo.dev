---
name: cr
description: >
  Multi-agent code review of the current diff. Starts eight reviewer subagents in parallel
  (security, tests, spec, performance, design, consistency, adversarial, architecture), each
  writing structured JSON, then merges their findings into one ranked report with stable ids.
  TRIGGER when the user types /cr or asks for "cr" by name.
  NOT for a quick self-check after an edit, a review a hook or subagent requests, or acting on
  review comments (use superpowers:receiving-code-review).
disable-model-invocation: true
argument-hint: "[<base-ref> | --staged | --working]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - Agent
---

# /cr — multi-agent code review

Eight reviewers look at the same diff in parallel, each from one dimension. You are the coordinator: you capture the diff, start the reviewers, check their output, merge the findings and write one report. No coordinator subagent runs, and no verification pass runs after the reviewers.

## Invocation policy (read first)

Run this skill only when the user types `/cr` or asks for it by name. It starts eight agents at once, so it is expensive. A hook, another skill, a subagent or a "review this" habit after an edit does not start it. If a context that is not the user tries to start it, refuse and tell the user to run `/cr` themselves.

## Arguments

| Argument | Review |
|---|---|
| (empty) | The commits on the current branch since it left `main`, plus staged and unstaged changes |
| `<ref>` (a branch, a tag or a SHA) | `HEAD` against that ref |
| `--staged` | Only the staged diff |
| `--working` | Only the unstaged working-tree diff |

If an argument can be a ref or a typo, treat it as a ref and tell the user what it resolved to.

## Step 1 — Capture the diff

1. Make a work folder for this run: `WORK=$(mktemp -d -t cr-XXXXXX)`. Record the repository root: `REPO_ROOT=$(git rev-parse --show-toplevel)`.
2. Write these files into `$WORK`, for the scope the argument selects:
   - `diff.patch`: the whole diff. For the default scope, join the branch diff (`git diff $(git merge-base main HEAD)...HEAD`), the staged diff and the unstaged diff.
   - `files.txt`: the changed paths, one per line, no duplicates.
   - `commits.txt`: the subject and body of each commit in scope. Empty for `--staged` and `--working`.
   - `scope.txt`: the mode, the base SHA and the head SHA.
3. If `diff.patch` is empty, stop and tell the user there is nothing to review.
4. Collect spec context for the `spec` reviewer and write it to `spec_context.txt`:
   - the spec or design files in `files.txt`;
   - for each bead id that `commits.txt` names (for example `est-dog.20.17`), the output of `bd show <id>`. Use `bd show` only: the review reads beads and never changes their status;
   - when `files.txt` holds a UI change (a `.tsx` or `.css` file under `src/`, or `src/content.ts`), a line saying that `docs/design/Panes.dc.html` is the design source of truth for this change;
   - the PR body when a PR exists (`gh pr view --json body`).
5. Print one line of scope, for example `Reviewing 7 files, +312 / -54, against main (HEAD abc1234)`.

**Done when:** `diff.patch`, `files.txt`, `commits.txt`, `scope.txt` and `spec_context.txt` exist in `$WORK`, and the user saw the scope line.

## Step 2 — Start eight reviewers in parallel

In **one message**, start eight subagents, one for each role below. Do not start them one after another. Each prompt is the common preamble, then the role's block, with `{role}`, `{WORK}` and `{REPO_ROOT}` replaced by the real values.

| Role | Looks for |
|---|---|
| `security` | authentication and authorization gaps, leaked secrets, injection, path traversal, sensitive data in logs, weak crypto |
| `tests` | coverage gaps and missing edge cases. It may run the targeted tests. |
| `spec` | the change does what its task or spec asks, with no drift, and follows the commit-message convention |
| `performance` | N+1 queries, leaks, blocking work on hot paths, missing pagination |
| `design` | maintainability, naming, error handling, comment quality |
| `consistency` | alignment with the patterns of sibling files and with the project's library and idiom conventions |
| `adversarial` | makes each new construct justify its existence: over-engineering, speculative generality, defensive code, scope creep |
| `architecture` | the project's own layering and placement rules, as the project documents them |

### Common preamble

> You are the **{role}** reviewer in a parallel code review. Seven other reviewers cover other dimensions. Stay in your own dimension.
>
> A finding you rate `high` or `critical` goes straight into the report's "Must fix" section, under your name. Nothing checks it again before the author acts on it. So earn the severity: open the real file, not only the patch, and read the whole enclosing function or class with its imports before you file. Many false findings come from a guard, an annotation or a check just outside the changed lines. Rate `high` only when you read the lines and can name the trigger and the consequence, or can quote the rule or spec line that the change breaks. Otherwise rate it `medium` and say what you could not confirm.
>
> **Inputs:** `{WORK}/diff.patch`, `{WORK}/files.txt`, `{WORK}/commits.txt`, `{WORK}/scope.txt`, `{WORK}/spec_context.txt`. Read files under `{REPO_ROOT}` for context.
>
> **Output:** write one JSON file, `{WORK}/{role}.json`:
> ```json
> {
>   "reviewer": "{role}",
>   "summary": "<one sentence>",
>   "findings": [
>     {
>       "severity": "critical|high|medium|low|info",
>       "category": "<short tag>",
>       "file": "<path relative to the repository root>",
>       "line": 0,
>       "title": "<80 characters or fewer>",
>       "description": "<one to three sentences: why it is a problem>",
>       "recommendation": "<a concrete fix>"
>     }
>   ]
> }
> ```
> Use `null` for `line` when no single line applies.
>
> **Rules:**
> - Read only. Change no code.
> - Report only problems that the diff adds, makes worse or fails to handle. A problem in unchanged code belongs to another review.
> - Prefer a few strong findings to many weak ones. A finding without a concrete recommendation is `info`, or you drop it.
> - Anchor each finding to `file:line` when you can.
> - After you write the file, reply with one or two sentences only. The coordinator reads the JSON.

### Role blocks

**security**
- An endpoint or action with no authorization check. Code that trusts an id from the request without checking that the caller owns the resource.
- A secret in source, templates, fixtures or a committed `.env` file.
- Injection: SQL built from strings, shell commands built from input, user input written raw into HTML or logs.
- Path traversal and server-side request forgery: user input that reaches a file path or an outgoing URL without normalization or an allowlist.
- Passwords, tokens or personal data in logs.
- Weak crypto: MD5 or SHA-1 for security, a non-secure random source, a fixed IV, weak TLS settings.
- Severity: `critical` = exploitable by an unauthenticated user. `high` = exploitable with a login or a role. `medium` = defence in depth. `low` = best practice.

**tests**
- For each change in behaviour (a new public method, a new branch, a new validation rule): is there a new or changed test? Scale the severity by risk.
- Missing edge cases: empty and null input, boundaries, denied access, rollback, concurrent change, retries.
- Weak tests: no assertion, a mocked system under test, a duplicate test, a test that only checks that nothing threw.
- Take the test commands from the "### Tests and gates" table in `AGENTS.md`. You may run the narrowest one for the changed files, with a 5-minute limit, through build-slot: `build-slot cr-tests -- npx vitest run <test file>…`. Run only the test files that cover the diff; the full gates belong to the author. If you cannot run tests safely, put the exact command in `recommendation` and file an `info` finding that says you did not run them.
- Severity: `critical` = a test you ran failed. `high` = a core path has no test. `medium` = an edge case has no test. `low` = a test could be more specific.

**spec**
- Compare the change with `spec_context.txt`: the bead text, the PR body or the spec file. Flag behaviour the spec asks for and the diff does not deliver, and behaviour the diff adds that the spec does not ask for.
- For a UI change, open `docs/design/Panes.dc.html` and compare the changed markup, copy and styles with it. It is the design source of truth.
- Flag a change to the spec's intent that the PR does not record as a decision.
- Check each commit message against the convention in `AGENTS.md`.
- If there is no spec context, say so in the summary and review commit messages only.

**performance**
- A query or call inside a loop (N+1), a missing index for a new query pattern, an unbounded list with no pagination.
- Blocking I/O on a hot path or a request thread, work that a cache or a batch could remove.
- Leaks: unclosed resources, listeners or subscriptions that are never removed, collections that only grow.

**design**
- Hard-to-change code: long functions, mixed responsibilities, hidden coupling.
- Names that do not say what a thing is or does.
- Error handling that swallows, hides or misreports a failure.
- Comments that repeat the code, or that are now wrong.

**consistency**
- Read two or three sibling files of each changed file. Flag a new pattern where the project already has one for the same job.
- Flag a new library or helper that duplicates one the project already uses.
- Flag naming, layout and idiom that differ from the surrounding code.

**adversarial**
- Make each new abstraction, option, layer, flag and defensive branch justify itself. Ask: what breaks if this is deleted?
- Flag speculative generality (built for cases nobody asked for), defensive code for states that cannot happen, and scope creep beyond the task.
- Recommend the smaller change that does the same job.

**architecture**
- Read the project's documented architecture rules first: the "### Architecture" section of `AGENTS.md`, any rule file beside a changed module, and the constraints in `doc/concepts/engineering/`.
- Flag layer breaches, code in the wrong module, forbidden imports, new dependency cycles, and new shared code that branches on one customer or one caller.
- Cite the rule each finding breaks. If the project documents no architecture rules, return no findings and say so in the summary. Do not invent rules.

**Done when:** all eight subagents returned.

## Step 3 — Check the reviewer output

1. For each role, check that `$WORK/<role>.json` exists, is not empty and parses as JSON.
2. Start a missing or invalid reviewer again, alone, with this note: "Your last run did not write a valid `{WORK}/{role}.json`. Write it now, to the schema."
3. Try at most twice per reviewer. If a reviewer still fails, name it in the report and continue with the others.

**Done when:** each role has a valid file or is named as failed.

## Step 4 — Merge the findings

You do this yourself. No subagent does it.

1. **Normalize.** Drop a finding with no `severity`, `file` or `description`. Change an unknown severity to `info` and note it.
2. **Merge duplicates.** Two findings are one when they share the file, a line within ±2 and the category, or when their titles mean the same thing. Keep the highest severity, join the descriptions when they add something, and list every source reviewer in `sources`.
3. **Sort** by severity (`critical`, `high`, `medium`, `low`, `info`), then by file path, then by line.
4. **Give ids.** Number the sorted findings `CR-01`, `CR-02`, and so on (three digits after 99). An id never changes. The user quotes it back ("fix CR-03"). Write the whole list to `$WORK/findings.json`.
5. **Must fix.** Every finding of severity `high` or above. Write them to `$WORK/must-fix.json`.

No verification pass runs, so the report must not claim more than the reviewers established. Write each must-fix from the reviewer's description and recommendation, and name the reviewer. Read the anchored lines yourself to get names and line numbers right. Do not add a trigger, mechanism or fix that the reviewer did not give. Where a part has nothing behind it, write "not established by the <role> reviewer".

## Step 5 — Write the report

Print one markdown report in this order. "Must fix" comes last, so it is at the bottom of the terminal, where the user starts to read. Every finding starts with its id in every section.

```markdown
# Code review

Scope: <mode>, <n> files, +<added> / -<removed>, base <sha>, head <sha>
Findings: <n> total — <a> critical, <b> high, <c> medium, <d> low, <e> info.
Severities are as each reviewer filed them. No verification pass ran.

## Findings index
| Id | Severity | Reviewer | Location | Title |
|---|---|---|---|---|
| CR-01 | critical | security | src/path/File.tsx:42 | <title> |

## Findings by file
### src/path/File.tsx
- **CR-01** [critical | security] :42 — <title> → must fix
- **CR-04** [medium | design] :88 — <title>

## Reviewer notes
- security: <n> findings, <summary>
- tests: <n> findings. Suggested command: <the narrow test command>
- <a reviewer that failed, and why>

## Must fix (<n>)
### CR-01 · critical · security — <title>
**Where:** src/path/File.tsx:42
**What is wrong:** <from the reviewer's description>
**Why it matters:** <the trigger and the consequence, or "not established by the security reviewer">
**Fix:** <from the reviewer's recommendation>
*Filed by the security reviewer. Not independently checked.*
```

When there are no findings, say so in one line. "No findings" is a valid review.

## Rules

- Only the user starts this skill.
- All eight reviewers start in one message.
- Reviewers read. Nobody changes code during the review.
- Each finding has one stable id, in every section.
- The report never claims more confidence than the reviewers established.
