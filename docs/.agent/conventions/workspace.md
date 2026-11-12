---
summary: Protects user-owned changes and constrains multi-file, generated, destructive, and parallel work in shared workspaces.
read_when:
  - working with pre-existing uncommitted changes or mixed file ownership
  - creating, moving, renaming, or deleting files in a multi-file change
  - running broad formatting, code generation, or repository-wide rewrites
  - using worktrees or multiple write-capable agents
---

# Workspace Discipline

## Boundary With Git And VCS

This convention protects the shared working tree. It does not define commit message, branch model, release, hotfix, merge, rebase, cherry-pick, tag, or remote-protection policy.

- Do not read `git.md` or `vcs.md` merely because this workspace convention applies.
- Read `git.md` only when the task stages, commits, tags, rebases, cherry-picks, force-pushes, resolves Git conflicts, writes Git messages, or changes repository state through Git commands.
- Read `vcs.md` only when the task decides branch model, source/target branch, merge strategy, release flow, hotfix flow, remote protection, or PR/MR routing.
- Use this file alongside Git or VCS conventions only when those operations may touch user-owned local changes.

## Rules

- Before editing, inspect workspace state with the project's standard VCS status command.
- Treat all pre-existing uncommitted changes as user-owned unless clearly produced by the current task.
- Do not overwrite, revert, reformat, move, or delete user-owned changes unless explicitly asked.
- Do not edit files with unrelated uncommitted changes unless the task requires it.
- If a file has mixed user-owned and task-relevant changes, make the smallest safe edit and report the overlap.
- Prefer isolated worktrees or other explicit isolation for parallel tasks.
- Do not assume another agent's partial work is safe to modify.
- Do not run broad formatters or generators unless required by the task or project convention.
- If broad formatting or generation is required, report it in completion evidence.

## Parallel Agent Isolation

- Do not let multiple write-capable agents operate in the same working tree concurrently.
- Give each write-capable agent an isolated worktree or equivalent isolated workspace based on the same agreed revision and spec.
- Name one integration owner responsible for applying patches, resolving conflicts, and validating the integrated result.
- Restrict a test developer's writes to the test, fixture, and validation-artifact paths named in the accepted plan.
- Run final verification against the integrated final state with source-editing tools disabled; command-generated caches or reports are not source edits.
- Do not expose unrelated uncommitted user changes to an external agent. If those changes are required context, create an explicit safe snapshot or run the work sequentially.
- If isolation cannot be established safely, use sequential agent work instead of parallel writes.

## Completion Evidence Additions

When this file applies, report:

- whether pre-existing uncommitted changes were present
- whether any touched file had unrelated changes
- whether broad formatting or generation was run
- any workspace risks left unresolved
