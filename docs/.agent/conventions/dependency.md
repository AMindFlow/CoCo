---
summary: Keeps dependency and toolchain changes intentional, reviewable, and scoped.
read_when:
  - adding, removing, upgrading, or replacing a dependency
  - changing a package manager, lockfile, language version, framework, build tool, or runtime tool
---

# Dependency Policy

## Rules

- Do not add production dependencies without explicit approval.
- Prefer existing project dependencies and standard library features.
- Do not change package manager, lockfile format, language version, framework version, or build tool unless explicitly required.
- Keep dependency changes separate from unrelated feature work when practical.
- If a dependency is necessary, explain why existing tools are insufficient, whether it is runtime or dev-only, and the security/maintenance tradeoffs.

## Completion Evidence Additions

When this file applies, report:

- dependency or toolchain changed
- reason existing tools were insufficient
- lockfile or config impact
- validation performed
