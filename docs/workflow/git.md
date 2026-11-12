---
summary: Defines canonical Git command safety, commit messages, history edits, conflict handling, tags, staging, and push rules.
read_when:
  - staging, committing, tagging, rebasing, cherry-picking, force-pushing, or resolving Git conflicts
  - writing commit, merge, squash, release, or hotfix messages
  - reviewing command-level Git safety or recovery behavior
---

# Git Operating Rules

## Boundary With VCS Workflow

Use this document for command-level Git work. Use `docs/workflow/vcs.md` for branch, merge, release, hotfix, and remote-protection strategy; decide VCS strategy first when both apply.

## Commit Message Format

Use Conventional Commits:

```text
<type>(<scope>): <summary>

<body>

<footer>
```

Allowed types:

- `feat`: user-visible or developer-facing feature
- `fix`: bug fix
- `docs`: documentation-only change
- `style`: formatting-only change with no behavior change
- `refactor`: code restructuring with no behavior change
- `perf`: performance improvement
- `test`: test-only change
- `build`: build system or dependency change
- `ci`: CI/CD workflow change
- `chore`: maintenance change that does not fit other types
- `revert`: revert a previous commit
- `release`: release coordination commit
- `hotfix`: production hotfix coordination commit

Rules:

- Keep each commit atomic: one logical change per commit.
- Choose the type from the actual change, not from the branch name.
- Do not invent extra commit types for activities such as config correction, version bump, or changelog update; choose the closest allowed type from the content.
- Use a stable scope from the affected module, package, or domain.
- Write the summary in imperative mood and keep it concise.
- Use the body when the reason, trade-off, migration, or behavior change is not obvious.
- Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- Reference issues or tasks in the footer when applicable.
- Merge commits should follow the same format when practical.
- Squash-merge commit messages should describe the combined change, not the source branch name.
- PR titles and squash-merge commit messages must follow the same format.

## Task Commit Cadence

When a feature, refactor, fix, or chore branch is governed by `tasks.md`:

- Each agent completes and validates one independently verifiable `Txxx` task before starting its next task. Multiple agents may run `[P]` tasks concurrently under the rule below. Record the task-level check in the task text; a phase exit check gates phase completion only.
- After the task-level check passes, stage the task-status update with its implementation changes and create one task commit; include `Txxx` in the commit footer, such as `Task: T001`.
- Keep the implementation, tests, documentation, and task-status changes required by that task in the same commit.
- `[P]` tasks may run concurrently only after dependencies are satisfied and file ownership and workspace isolation are confirmed; each task still gets its own task commit.
- Do not combine independent tasks in one commit. If a task cannot be independently verified, split it or record a scoped exception and reason in the task text before implementation.
- This cadence applies within the working branch; the completed branch may still be squash-merged to `dev` under `docs/workflow/vcs.md`.

## Git Preflight

Before changing branches or history, inspect:

```bash
git status
git branch --show-current
git log --graph --oneline --decorate --all -n 30
```

Before a merge, rebase, cherry-pick, reset, or force-push, identify:

- current branch
- target branch
- source branch or source commit
- intended operation
- whether the operation changes history
- whether the branch may be shared

## Operations Requiring Explicit User Authorization

Do not run these without explicit user authorization:

```bash
git push --force
git push --force-with-lease
git reset --hard
git clean -fd
```

Also ask before overwriting, discarding, or reverting user changes.

## Rebase Policy

Allowed:

- local, unshared `feature/*`, `refactor/*`, `fix/*`, `chore/*`, `spike/*`, or `hotfix/*` branches
- cleaning local commits before opening a PR or MR while the branch remains unshared

Forbidden:

- rebasing `main`
- rebasing `dev`
- rebasing `release/*`
- rebasing shared `hotfix/*`
- rebasing any branch another developer or agent may have based work on

Rebasing `main`, `dev`, or `release/*` remains forbidden even with explicit user authorization.

If a branch has been pushed or might be shared, do not rebase it; clean local commits only while the branch remains unshared.

## Staging And Tagging

- Review `git diff` and `git diff --cached` before committing; stage only files that belong to the intended atomic change.
- Follow `docs/workflow/vcs.md` for release tags and tag pushes.

## Cherry-Pick Policy

Use cherry-pick for precise patch transfer:

```bash
git cherry-pick -x <commit-hash>
```

Allowed use cases:

- forwarding a stable hotfix to `dev`
- transferring one release fix to `dev` when merging the full release branch is unsafe
- backporting or forward-porting a precise patch between maintained versions

Rules:

- Prefer cherry-pick only for precise patch transfer.
- Use `-x` on public/shared branches so the new commit records the original commit reference.
- Do not later blindly merge the source branch if that may duplicate the cherry-picked patch.
- If conflicts occur, stop and report the conflict instead of guessing.

## Conflict Handling

If a Git operation conflicts:

1. Stop.
2. Report conflicted files.
3. Explain which operation caused the conflict.
4. Resolve only when the intended semantics are clear from code or docs.
5. Run relevant validation after resolution when feasible.

## Completion Evidence

After a Git workflow action, report:

- starting branch
- operation performed
- source and target
- created commit hash or cherry-picked commit when available
- conflicts, if any
- validation run, if any
- final branch status
