---
summary: Routes Git state changes to canonical command-safety, message, history, push, and conflict rules.
read_when:
  - staging, committing, tagging, rebasing, cherry-picking, force-pushing, or resolving Git conflicts
  - writing commit, merge, squash, release, or hotfix messages
  - changing repository history, tags, remotes, or pushed state through Git commands
---

# Git Operating Convention

## Canonical Source

Read `docs/workflow/git.md` before Git command work that changes repository state or before writing commit, merge, squash, release, or hotfix messages. Do not use this wrapper as the source of commit-format or Git-operation policy.

Read `docs/workflow/vcs.md` as well when the Git operation affects branch flow, release flow, hotfix flow, or protected branches.

Use `vcs.md` to decide what should happen; use this file to execute it safely with Git.

## When This Applies

This convention applies when the task involves:

- staging files or creating commits
- writing commit, merge, squash, revert, release, or hotfix messages
- tagging releases
- merging, rebasing, cherry-picking, or resolving Git conflicts
- pushing, force-pushing, or changing remote refs
- resetting, cleaning, restoring, or discarding changes

## Agent Rules

- Do not read `docs/workflow/git.md` for a read-only status check unless the task also involves Git state changes or Git message writing.
- Ask before destructive or history-rewriting operations.
- Stop and report conflicts before resolving unless intended semantics are clear from code or docs.

## Completion Evidence Additions

When this file applies, report:

- staged files or commit hash when created
- commit message used or proposed
- branch before and after the operation
- Git commands run
- validation run after Git changes
- any user changes preserved or intentionally left unstaged
