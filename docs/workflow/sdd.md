---
summary: Defines the human approval, implementation verification, promotion, archival, and replacement workflow for SDD specs.
read_when:
  - creating or approving a spec
  - starting, completing, or validating spec implementation
  - promoting, archiving, or superseding a spec
---

# SDD Workflow

This document is the canonical human-readable workflow for spec review, implementation state, and lifecycle classification.

## Two Independent States

Every `spec.md` records:

```text
Review: draft | approved
Implementation: not_started | in_progress | complete | verified
```

- `Review` answers whether the current requirement contract has human approval.
- `Implementation` answers how far implementation against that contract has progressed.
- Directory position answers whether the spec is provisional, normative, archived, or replaced.

## Human Gates

- Only a human may change `Review` from `draft` to `approved`.
- Implementation must not start while `Review` is `draft`.
- An explicit instruction to implement a presented or linked spec counts as approval when the spec adds no material changes to requirements, scope, constraints, or acceptance criteria beyond that instruction.
- Only a human may change `Implementation` from `complete` to `verified`.
- Passing tests, independent-agent review, a commit, a merge, or deployment does not by itself satisfy either human gate.
- When approval or verification is ambiguous, leave the state unchanged and ask for confirmation.

## Implementation Flow

| State | Meaning | Allowed next step |
| --- | --- | --- |
| `draft / not_started` | Requirements are being prepared or reviewed | Human approves the current revision |
| `approved / not_started` | Implementation may begin | Agent sets `in_progress` when work starts |
| `approved / in_progress` | Implementation and technical validation are active | Agent sets `complete` after agreed checks pass |
| `approved / complete` | Agent work is delivered and awaits human validation | Human verifies, or the agent sets `in_progress` when human-requested rework starts |
| `approved / verified` | Human has accepted the implemented result | Keep as current standard or move lifecycle class |

While `Review` is `draft`, `Implementation` stays `not_started`; no other draft implementation combination is reachable.

Material changes to requirements, scope, constraints, or acceptance criteria reset an approved but unverified spike to `draft / not_started`. Existing code becomes baseline evidence for the revised spec, not proof of implementation.

`verified` does not transition backward. Any later material change uses a successor spike.

## Lifecycle Directories

### `spike/`

A provisional or trial spec. It may already affect real business behavior without being the formal standard. New specs start here unless the user explicitly requests another class.

### `official/`

The current normative business or system standard. It must describe intended behavior well enough to reconstruct the feature if implementation is damaged or lost. Promotion requires `approved / verified` plus explicit human direction.

### `archived/`

A non-normative historical record for a one-time change, such as replacing infrastructure or adding an isolated capability that does not define the continuing business flow. Archive only after it is no longer an active implementation contract and a human explicitly chooses archival.

### `superseded/`

A former normative standard replaced by another spec, including a successor whose requirement is to remove the old behavior. Keep predecessor and successor links so past behavior can be reconstructed. Do not use it as the current implementation contract.

## Lifecycle Flow

1. Create `docs/specs/spike/<feature-slice-name>/spec.md` with `draft / not_started`.
2. Obtain human approval before implementation.
3. Implement and technically validate; stop at `complete`.
4. Obtain human validation before setting `verified`.
5. Keep the verified spec in `spike/`, promote it to `official/`, or move a one-time record to `archived/` only on human direction.
6. To change or remove an official standard, create a successor under `spike/`. After the successor is verified and promoted, move the old official directory to `superseded/` and link both specs.

## Removal And Retirement

- Treat removal as an intended system or contract outcome, not as the absence of requirements.
- A removal spec defines the behavior, interface, data, or workflow that must cease; what must remain; affected consumers; migration or compatibility needs; partial-removal behavior; and recovery or rollback expectations.
- To remove an `official/` standard, use a successor spike. Do not delete or materially rewrite the predecessor while it remains the normative reconstruction source.
- When continued absence is the durable standard, verify and promote the successor, then move the predecessor to `superseded/` and link both directions.
- When removal is a one-time cleanup with no continuing normative behavior, reconcile durable post-removal facts into their canonical homes and move the verified change record to `archived/` only on human direction.

## Move And History Rules

- Classification lives only in the directory path; do not duplicate it in spec metadata.
- Move the whole feature-slice directory. Do not copy it across lifecycle classes.
- Preserve the feature-slice name unless the business concept itself changed.
- Update predecessor, successor, current-state, and project-relative links in the same change.
- A verified spike does not become official automatically.
- Archived and superseded specs are read only for audit, migration history, regression analysis, or explicit user requests.

## Completion Language

- `complete`: implementation and technical checks are finished; human verification is pending.
- `verified`: a human explicitly accepted the implemented result.
- Agents must state the current spec path and both states when delivering material work governed by a spec.
