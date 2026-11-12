---
summary: Records the project's changing baseline, active focus, open decisions, known risks, and next-read candidates.
read_when:
  - a task depends on current project status, active focus, open decisions, or known risks
  - updating the implemented baseline after a material project change
  - selecting a current spec or operational context without scanning historical documents
---

# Current State

## Snapshot

- Project profile: `docs/project/overview.md`.
- Lifecycle state: initialized from the vibe coding project template.
- Active focus: define the first SDD feature slice before material implementation work.

## Implemented Baseline

- Root agent contract owns task classification, candidate discovery, and base completion evidence.
- Project-specific implementation is not assumed until human-approved specs record it.
- New specs start under `docs/specs/spike/`; agents stop at `Implementation: complete` until a human verifies the result.
- Document growth follows the soft budgets in `docs/.agent/conventions/docs.md`; project initialization installs no repository guardrails or Git hooks.

## Open Decisions

- First feature slice and acceptance criteria.
- Component-level technology choices not settled by the approved stack summary.
- External dependencies, domain details, architecture, and validation entry points.

## Known Risks

- An initialized but uncommitted scaffold may still be waiting for an approved technology stack.
- Detailed operating boundaries may remain incomplete until accepted specs refine them.
- Current status can become stale if accepted specs change project scope without updating this file.

## Next Read Candidates

- `AGENTS.md`: root runtime contract.
- `docs/project/overview.md`: stable context when project identity, boundaries, or ownership matter.
- Matching standard under `docs/specs/official/` or active change under `docs/specs/spike/`: only when the task or user reference selects it.
- Routed workflow or agent convention docs: only when selected by task type, touched area, or explicit request.

Do not scan all specs to find possible context; use filenames, user references, or known touched areas to select a spec.
