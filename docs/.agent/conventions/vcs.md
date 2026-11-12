---
summary: Routes branch, merge, release, hotfix, and remote-protection decisions to the canonical VCS workflow.
read_when:
  - deciding a branch model, source branch, target branch, or merge strategy
  - planning release, hotfix, fix-forward, or version-line maintenance work
  - changing remote protection or pull-request routing policy
---

# VCS Workflow Convention

## Canonical Source

Read `docs/workflow/vcs.md` before making or recommending branch-model, merge-flow, release, hotfix, or remote-protection changes.

This convention is an agent-facing wrapper. The human-readable workflow is canonical. Do not use this wrapper as the source of branch, merge, release, hotfix, or remote-protection policy. Use `git.md` only after the VCS strategy is known and Git command safety or commit-message rules are needed.

## When This Applies

This convention applies when the task involves:

- creating, naming, merging, or deleting branches
- deciding source and target branches
- release branch creation or stabilization
- hotfix creation, promotion, or return to development
- choosing squash merge, normal merge, cherry-pick, or rebase
- remote branch protection or PR/MR requirements
- documentation changes to VCS workflow

## Agent Rules

- Do not read `docs/workflow/vcs.md` for a read-only status check unless the task also involves branch, merge, release, hotfix, remote-protection, or PR/MR routing decisions.
- Inspect current branch and working tree before branch or history operations.
- Ask before destructive or history-rewriting operations.
- Report when VCS policy was not read because the task did not involve VCS decisions.

## Missing Or Ambiguous Workflow

If `docs/workflow/vcs.md` is missing, outdated, or conflicts with user instructions:

- follow the user's current explicit instruction when it is safe
- avoid destructive or history-rewriting operations
- ask before changing shared branch history
- report the missing or ambiguous rule in completion evidence

## Completion Evidence Additions

When this file applies, report:

- branch before and after the operation
- source and target branch or commit
- selected strategy and why
- whether canonical workflow docs were read
- conflicts, skipped operations, or remote-policy assumptions
