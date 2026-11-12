---
summary: Provides the technical design template for architecture, interfaces, failure handling, rollout, and validation strategy.
read_when:
  - creating a technical design for an accepted spec
  - structuring implementation choices, failure behavior, migration, or validation design for review
---

# <Feature Slice Name> Design

## Provenance

- Requirements: `spec.md`
- Planning source: direct | Codex Plan Mode | Claude Code Plan Mode | other
- Raw planning artifact: none | `artifacts/plan-mode/<file>`
- Updated: YYYY-MM-DD

## Design Summary

Summarize the chosen technical approach and why it fits the requirements.

## Requirement Mapping

| Requirement | Design response | Validation |
| --- | --- | --- |
| R-001 | | |

## Technical Context

Record relevant existing architecture, dependencies, constraints, and assumptions. Link canonical project docs instead of repeating them.

## Architecture And Boundaries

Describe the affected modules, ownership boundaries, and dependency direction.

## Components And Responsibilities

| Component | Responsibility | Change |
| --- | --- | --- |
| | | |

## Interfaces And Data Flow

- Inputs:
- Outputs:
- Interfaces or schemas:
- Main flow:
- State transitions:

## Failure Handling And Recovery

- Validation and rejected input:
- Dependency or partial failure:
- Recovery, retry, or rollback:
- User-visible fallback:

## Non-Functional Design

Include only applicable security, privacy, performance, reliability, compatibility, observability, and accessibility decisions.

-

## Migration And Rollout

- Migration or compatibility path:
- Rollout sequence:
- Rollback trigger and procedure:

## Validation Design

Define this before implementation.

- Tests to add or change:
- Deterministic commands:
- Manual checks:
- Independent verification: not required | default | required
- Test-agent write scope:
- Final-verifier command scope:
- Provider or fallback:
- Pass conditions:

## Open Design Questions

-

## Linked Decisions And References

- Decisions: none | `decisions.md#d-001-title`
- References: none | `refs/<file>`
