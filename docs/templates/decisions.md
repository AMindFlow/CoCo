---
summary: Provides the sparse decision template for consequential choices, alternatives, rationale, and confirmation.
read_when:
  - recording a non-obvious choice with plausible alternatives and lasting consequences
  - restructuring decision records that contain routine implementation notes or duplicate design facts
---

# <Feature Slice Name> Decisions

Create this file only when the change has a non-obvious decision with plausible alternatives and meaningful long-term consequences. Do not record routine implementation choices.

A decision belongs here when it affects architecture, ownership boundaries, security, operations, compatibility, or project conventions, or when reversal would be costly. Move cross-spec governance decisions to the project's canonical ADR location and leave a link here.

## D-001: <Decision Title>

- Status: proposed | accepted | rejected | superseded
- Date: YYYY-MM-DD
- Requirement or task: R-001 | T001
- Supersedes: none | D-000

### Context And Drivers

Describe the decision pressure, constraints, and forces that make the choice consequential.

### Considered Options

1. **<Option>**: benefits, costs, and risks.
2. **<Option>**: benefits, costs, and risks.

### Decision And Rationale

State the selected option and why it best satisfies the drivers.

### Consequences

- Positive:
- Negative or trade-off:
- Follow-up obligation:

### Confirmation

State how implementation or validation will prove the decision was applied.
