# Engineering concepts

This folder holds constraints that the code satisfies and the reason each one holds. One file per constraint.

## What belongs here

A constraint that a refactor could silently drop, and that no type, schema, lint rule or test enforces yet. Examples:

- a closed set of states that a section can be in,
- a size or length limit,
- an acyclic dependency rule between modules.

Each file says what the constraint is, why it holds, and which code it binds (documents may cite code; code comments never cite documents).

## What does not belong here

- A constraint that a type, a `zod` schema, an ESLint rule or a test already enforces. The check is the record. Delete the file when a check takes over.
- What a screen looks like. That is a mock in the screen renderer, never prose.
- How code behaves. That goes in a code comment beside the code; a module's overview goes in the doc comment at its top.
- Procedures a person does by hand. Those go in `doc/runbook/`.

There are no entries yet.
