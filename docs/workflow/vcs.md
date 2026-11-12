---
summary: Defines canonical branch roles, lineage, merge strategy, release and hotfix flow, and remote protection rules.
read_when:
  - choosing a source branch, target branch, branch type, or merge strategy
  - planning a release, hotfix, fix-forward, or stable-version maintenance flow
  - configuring or reviewing remote branch protection and pull-request routing
---

# VCS Workflow

This document is the canonical human-readable branch, merge, release, hotfix, and remote protection workflow.

Use `docs/workflow/git.md` for command-level Git safety, task commit cadence, and history operations.

## Branch Roles

| Branch | Role | Source | Normal target |
|---|---|---|---|
| `main` | Default stable snapshot | stable `release/*` | n/a |
| `dev` | Integration branch for next-version development | short-lived work and forwarded release fixes | `release/*` |
| `release/*` | Candidate release; after promotion, version maintenance line | `dev` | `main` and `dev` |
| `feature/*` | Product or business behavior change | `dev` | `dev` |
| `refactor/*` | Internal restructuring without intended behavior change | `dev` | `dev` |
| `fix/*` | Non-production bug fix for next development version | `dev` | `dev` |
| `chore/*` | Tooling, dependencies, build scripts, or repository maintenance | `dev` | `dev` |
| `spike/*` | Investigation or experiment | `dev` | usually none |
| `hotfix/*` | Urgent fix for the current stable version | stable `release/<version>` | same `release/<version>` |

Avoid `test/*` as a long-lived branch category. Testing environments belong in CI/CD environment configuration, not permanent Git branches.

## Lineage Model

- `main` is a promotion sink only. It is produced by accepted stable `release/*` branches.
- Do not create feature, fix, hotfix, or future release work from `main`.
- `release/<version>` starts from `dev`, stabilizes, then promotes to `main` when accepted.
- After promotion, the same `release/<version>` remains the maintenance line for that stable version.
- Fixes accepted on a release line must be forwarded to `dev` so future releases include them.
- This stays maintainable when `main` receives only release promotions and release fixes are consistently forwarded.
- The main risk is conflict when `dev` has moved ahead; handle that during release-to-dev or hotfix-forwarding work, not by merging `main` into `dev`.

## Protected Branch Rules

- **Do not** commit directly to `main`.
- **Do not** commit directly to `dev` unless the user explicitly requests repository maintenance.
- **Do not** merge `dev` directly into `main`.
- **Do not** merge short-lived branches directly into `main`.
- **Do not** rebase `main`, `dev`, or `release/*`.
- **Do not** force-push protected branches.
- **Do not** overwrite uncommitted user work.

## Repository Bootstrap Exception

- A new standalone repository with no history may create one governance bootstrap commit directly on `main`.
- The bootstrap commit must contain only the reviewed initialization scaffold and use `chore(project): initialize repository`.
- Create `dev` from that commit and finish with `dev` checked out.
- The bootstrap commit is not a release promotion. Do not use this exception in an existing repository, a non-empty merge, or a repository with prior commits; every later `main` change must come from an accepted stable `release/*` branch.

## Short-Lived Work

Create short-lived development branches from the latest `dev`.

- Keep each branch scoped to one coherent task.
- Prefer local rebase only while the branch is unshared.
- Do not rebase shared branches.
- Merge `feature/*`, `refactor/*`, `fix/*`, and `chore/*` back to `dev` with squash merge unless the user explicitly requests preserved internal history.
- Do not merge `spike/*` unless it is converted into a clean change; if merged, squash it.

## Release Flow

Cut a release from `dev`:

```bash
git checkout dev
git pull
git checkout -b release/<version>
git push -u origin release/<version>
```

After a release is cut:

- `release/<version>` accepts only stabilization work.
- `dev` continues next-version development.
- New features continue from `dev`, not from `release/<version>`.

Allowed on `release/*`: bug fixes, documentation updates, changelog updates, version bumps, config corrections, migration corrections, and deployment script corrections.

Forbidden on `release/*`: new features, large refactors, experiments, unrelated cleanup, and temporary public-beta hacks that should not return to `dev`.

Stabilization branches should start from the target release branch:

- `bugfix/release-<version>-<short-description>` for release bug fixes
- `docs/release-<version>-<short-description>` for release documentation
- `chore/release-<version>-<short-description>` for release maintenance when useful

Promote an accepted release to `main` with a normal merge:

```bash
git checkout main
git pull
git merge --no-ff release/<version>
git tag v<version>
git push origin main --tags
```

Do not squash merge `release/*` into `main`.

## Returning Release Fixes To Dev

Forward release-line fixes to `dev` after they are accepted, whether before or after promotion to `main`.

- Use a normal merge when all release-line changes should enter future development.
- Use cherry-pick when only specific fixes should enter `dev` or a full merge would bring release-only changes.
- Resolve conflicts according to the future `dev` behavior, not old release behavior.
- Stop and request review when conflict semantics are unclear.
- Do not merge `main` into `dev` as the return path.

## Hotfix Flow

Create a hotfix from the stable `release/<version>` currently represented by `main`, not from the newest release candidate:

```bash
git checkout release/<version>
git pull
git checkout -b hotfix/<version-or-issue>-<short-description>
```

Merge the hotfix back to the same `release/<version>`, promote that release line to `main`, then forward the fix to `dev` and any active newer `release/*` branch that needs it.

Forward-port with a merge when the whole hotfix branch is safe to transfer. Use `cherry-pick -x` when only the patch should move. Apply the same conflict rule as release-to-dev forwarding.

## Merge Strategy

| Source | Target | Strategy |
|---|---|---|
| `feature/*`, `refactor/*`, `fix/*`, `chore/*` | `dev` | squash merge |
| `spike/*` | `dev` | usually do not merge; if merged, squash |
| `bugfix/release-*`, `docs/release-*`, `chore/release-*` | `release/*` | squash or normal merge |
| `release/*` | `main` | normal merge, no squash |
| `release/*` | `dev` | normal merge, or cherry-pick selected fixes |
| `hotfix/*` | same stable `release/*` | squash or normal merge |
| `hotfix/*` patch | `dev` or active newer `release/*` | merge or `cherry-pick -x` |

## Remote Protection

Local behavior rules only constrain people and agents that follow them. Remote enforcement requires repository rules, branch protection, required pull requests, required status checks, required reviews, tag restrictions, CI checks, or equivalent hosting controls.

Remote policy should distinguish release branch creation from release branch updates:

- Allow authorized creation of new `release/*` branches from the approved release-cut flow.
- Protect `main` from every source except stable release promotion.
- Protect existing `release/*` branches from direct commits, force-push, and deletion.
- Require stabilization and hotfix changes to enter existing `release/*` branches through reviewable PRs or MRs.
