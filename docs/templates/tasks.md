---
summary: Provides the execution template for ordered tasks, dependencies, progress state, phase splits, and final validation.
read_when:
  - creating an execution checklist for an accepted spec and design
  - restructuring a long task set around phases, dependencies, or document budgets
---

# <Feature Slice Name> Tasks

## Status

- Active tasks: T001
- Blockers: none
- Updated: YYYY-MM-DD

## Task Rules

- Follow the identifier and large-task-set rules in `docs/specs/AGENTS.md`; trace tasks to requirement or acceptance IDs when used.
- Name exact project-relative paths when known.
- Mark `[P]` only when, after listed dependencies are satisfied, the task can run beside another active task without file overlap.
- Put dependencies in `depends:` and blockers in the task text.
- Checkboxes are the progress source of truth; do not append a worklog.
- Each task must state a task-level check as a command or observable condition.
- A task is complete only when its task-level check passes; a phase is complete only when its phase exit check passes.
- Follow `docs/workflow/git.md` for `[P]` concurrency, task commit cadence, task-status updates, and scoped exceptions; do not combine independent tasks in one commit.

Task format:

```text
- [ ] T001 [P] [R-001, AC-001] Action - `<path/to/file>` - depends: none - check: <command or observable condition>
```

For a task set that would cross the document budget, keep status and phase routing here and move each canonical checklist under `tasks/`:

| Phase | Checklist | Depends on | Phase exit check |
| --- | --- | --- | --- |
| 1. <Outcome> | `tasks/01-<phase-name>.md` | none | `<command or condition>` |

Do not duplicate phase checkboxes in this index. Read only the active or dependency-relevant phase file.

## Phase 1: <Outcome>

Goal: Describe the usable or reviewable outcome of this phase.

- [ ] T001 [R-001, AC-001] <Action> - `<path>` - depends: none - check: <command or observable condition>

Phase exit check:

```bash
<deterministic command>
```

## Phase 2: <Outcome>

Goal: Describe the next independently verifiable outcome.

- [ ] T002 [P] [R-002] <Action> - `<path>` - depends: T001 - check: <command or observable condition>

Phase exit check:

```bash
<deterministic command>
```

## Final Validation

- [ ] T900 [AC-001] Run deterministic validation from `design.md` or `spec.md` when no design exists - depends: implementation tasks - check: validation commands pass and evidence is recorded
- [ ] T901 Reconcile requirement and acceptance statuses in `spec.md` - depends: T900 - check: all requirement and acceptance statuses reconcile
- [ ] T902 Record any qualifying implementation decisions in `decisions.md` - depends: implementation tasks - check: `decisions.md` contains only qualifying decisions
- [ ] T903 Complete required independent verification and report evidence - depends: T900 - check: required evidence and any fallback or waiver are recorded
- [ ] T904 Set `Implementation: complete` and request human verification - depends: T900, T901, T902, T903 - check: implementation state is complete and the human-verification request is recorded
