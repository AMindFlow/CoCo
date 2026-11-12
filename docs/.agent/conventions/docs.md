---
summary: Defines canonical homes, document roles, update triggers, metadata duties, and growth routing for project documentation.
read_when:
  - creating, moving, splitting, merging, deleting, or materially updating documentation
  - changing document metadata, canonical ownership, routing, or lifecycle
  - documenting behavior, architecture, interfaces, workflows, decisions, or project state
  - managing document growth or deciding whether a new document is justified
---

# Documentation Governance

## Canonical Home

- One fact has one canonical home.
- Other documents may summarize or link to the canonical home.
- Do not duplicate long rules or detailed decisions across documents.

## New Document Gate

Create a new document only when all are clear:

- canonical home
- primary reader
- task or lifecycle trigger for reading it
- expected lifecycle: active, durable, temporary, or archived

If any item is unclear, update an existing canonical document or do not write a document.

For a governed Markdown document, write its `summary` and `read_when` before drafting the body. Follow `metadata.md` for the schema, quality limits, and exceptions.

## Document Roles

- Handoff/onboarding: next-agent launchpad; include current branch, immediate task, next read path, and validation entry points.
- Project overview: durable project profile; include purpose, value, scope boundaries, domain vocabulary, technology posture, architecture map, and document ownership.
- Current-state: changing project state; include baseline status, active focus, open decisions, known risks, and next read path without restating stable overview facts.
- Spec: human-first requirement contract; owns problem, scope, observable behavior, constraints, and acceptance criteria.
- Design: technical contract; owns architecture, interfaces, failure handling, migration, and validation design.
- Tasks: execution contract; owns work order, dependencies, blockers, and progress checkboxes without becoming a worklog.
- Decisions: sparse rationale record for consequential choices and rejected alternatives, not routine implementation details.
- Rule/convention: repeatable behavior constraints for agents or developers.
- Template: reusable starting point with placeholders, not project-specific truth.

## Update Triggers

Update docs only when the change affects:

- public behavior
- architecture or module ownership
- API, interface, data contract, or workflow
- setup, build, test, deploy, or release flow
- security assumptions
- active handoff path
- accepted decision or project convention

Do not update docs for:

- typo fixes
- internal-only refactors with no boundary change
- test-only changes
- temporary investigation notes
- worklog-style progress entries
- speculative handoff/current-state entries when no active handoff or next-read candidates changed

## Growth Routing

- Before adding material, check the target document length.
- Prefer a short index plus routed detail documents over one large rule document.
- Treat 150 lines as the soft budget for general governed Markdown documents.
- Treat 300 lines as the soft budget for agent-facing Markdown under `docs/.agent/`.
- These budgets are advisory; project initialization does not install automated enforcement.
- Split, summarize, or route detail elsewhere before crossing the applicable budget.

## Shared Human-Agent Docs

- Use `docs/specs/<lifecycle>/<feature-slice-name>/` for requirement, design, task, and decision artifacts that humans and agents both need; new specs default to `spike/`.
- Use `docs/workflow/sdd.md` as the canonical human-readable source for spec review, implementation, promotion, archival, and replacement transitions.
- Create artifacts by lifecycle need: `spec.md` first, then `design.md` or `tasks.md` when planning requires them, and `decisions.md` only when a qualifying decision exists.
- Normalize accepted Plan Mode output into the canonical artifacts. Retain raw output only when it contains unique evidence; raw planning output is never a competing source of truth.
- Use `docs/project/` for stable project information and status that humans and agents both need to read.
- Keep stable project profile in `docs/project/overview.md`; keep changing status in `docs/project/current-state.md`.
- Treat shared docs as human-facing canonical sources first.
- Link from agent-facing docs to shared human docs instead of duplicating long content.
- Keep agent-facing wrappers focused on discovery, routing, and operational constraints.
- Standard SDD artifacts are routed by lifecycle path and filename and do not use document-discovery frontmatter.

## Scoped Instruction Gate

- Add a scoped `AGENTS.md` only for durable rules, ownership boundaries, or workflow constraints shared by multiple contents in that directory.
- Do not add one merely to list files, restate their summaries, or repeat their `read_when` triggers.
- When no scoped file is justified, use clear names and document metadata as the routing surface.

## Completion Evidence Additions

When this file applies, report:

- docs created or updated
- canonical home chosen
- routed documents linked or referenced
- docs intentionally not updated and why
