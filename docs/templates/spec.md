---
summary: Provides the requirement-first template for an SDD feature slice and its acceptance contract.
read_when:
  - creating the first artifact for a material or high-risk change
  - restructuring a spec around observable requirements, scope, constraints, and acceptance criteria
---

# <Feature Slice Name>

## Metadata

- Project: `CoCo`
- Review: draft | approved
- Implementation: not_started | in_progress | complete | verified (draft review requires not_started)
- Created: YYYY-MM-DD
- Updated: YYYY-MM-DD
- Predecessor: none | `<project-relative path>`
- Successor: none | `<project-relative path>`

## Problem And Goal

Describe the problem, who is affected, and the observable outcome this change must produce.

## Current Baseline

Record confirmed current facts only. Keep this to five bullets or fewer. For removal or retirement work, identify the existing surface and confirmed consumers or dependencies.

-

## Requirements

Use observable language and follow the directory-local ID rules in `docs/specs/AGENTS.md`. Avoid implementation choices. For removal or retirement work, state what must cease, what must remain, and required consumer migration or compatibility behavior.

- **R-001:**

## Scope

-

## Non-Goals

-

## Constraints

Link to canonical constraints instead of copying long rules.

-

## Edge And Failure Behavior

Describe required externally observable behavior for invalid input, dependency failure, partial state, recovery, and fallback. For removal or retirement work, also cover partial removal, stale consumers or data, and rollback.

-

## Acceptance Criteria

Trace each criterion to one or more requirements when IDs are used; mappings may be many-to-many. For removal or retirement work, prove retired surfaces are absent and preserved behavior remains.

- [ ] **AC-001 / R-001:**

## Success Measures

State measurable signals when the change has operational or product outcomes. Omit when acceptance criteria are sufficient.

-

## Assumptions And Open Questions

-

## Artifact Map

Create and link only the artifacts required by this change.

| Artifact | Create when | Path |
| --- | --- | --- |
| Technical design | The implementation approach or validation design needs review | `design.md` |
| Execution tasks | Work needs sequencing, dependency tracking, or progress state | `tasks.md` |
| Decision record | A non-obvious, consequential choice must survive the implementation | `decisions.md` |
| Detailed references | Supporting detail would obscure this requirement contract | `refs/` |
| Raw Plan Mode evidence | Unique planning evidence must be retained | `artifacts/plan-mode/` |
