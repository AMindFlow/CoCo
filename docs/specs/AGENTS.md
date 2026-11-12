---
summary: Defines directory, artifact, human-gate, traceability, and growth rules for shared SDD specifications.
read_when:
  - creating, changing, or closing an SDD artifact set
  - deciding whether work needs spec.md, design.md, tasks.md, or decisions.md
  - starting implementation or changing a spec lifecycle class
  - splitting a large task set or routing spec references and plan artifacts
---

# AGENTS.md

## Scope

This directory contains shared human-agent SDD artifacts. The files are human-readable canonical sources that agents read by task purpose.

## Rules

- `docs/workflow/sdd.md` is canonical for review, implementation, promotion, archival, and replacement transitions. Apply it before changing states or starting implementation.
- Each feature slice lives under exactly one lifecycle path: `docs/specs/<spike|official|archived|superseded>/<feature-slice-name>/`.
- Use `docs/workflow/sdd.md` for lifecycle paths and the default location for new specs.
- Use the review and implementation fields defined by `docs/workflow/sdd.md`.
- Do not promote, archive, or supersede a spec without explicit human direction.
- Create `spec.md` first. It owns the problem, requirements, scope, constraints, observable failure behavior, and acceptance criteria.
- Create `design.md` when the technical approach or validation design needs review. It owns architecture, interfaces, data flow, failure handling, migration, and validation strategy.
- Create `tasks.md` when work needs sequencing, dependency tracking, or progress state. It owns execution routing and progress directly or through routed phase checklists.
- Create `decisions.md` only for non-obvious choices with plausible alternatives and meaningful consequences. Do not log routine implementation choices.
- Use matching templates under `docs/templates/`; omit non-applicable sections instead of filling them with noise.
- Standard SDD artifacts do not use discovery frontmatter. Select them by lifecycle directory, feature-slice name, and standard filename.
- Keep reusable template metadata only while a file is under `docs/templates/`; remove it when instantiating an artifact.
- Normalize accepted Plan Mode output into the canonical files. Store raw output under `artifacts/plan-mode/` only for unique diagrams, research, external approval, high-risk audit evidence, or an explicit user request.
- Put split reference docs under `refs/`; route every nonstandard file and retained artifact explicitly from the canonical file that uses it.
- Do not treat directory presence as a reading checklist: read `spec.md` for requirements, `design.md` for implementation or validation planning, `tasks.md` for execution state, and `decisions.md` when rationale matters.
- Do not add scoped `AGENTS.md` files to individual spec directories by default.
- Add one only when the directory has durable execution rules that cannot live clearly in its canonical artifacts.
- Prefer updating the existing unverified spike for the same feature slice over creating parallel specs.
- Do not read `archived/` or `superseded/` by default; follow `docs/workflow/sdd.md` for allowed historical-use cases.
- Keep artifacts usable by humans first; split supporting detail into `refs/` before the document budget in `docs/.agent/conventions/docs.md` is crossed.
- Use project-relative links only.
- Do not use any artifact as a worklog or duplicate another artifact's canonical content.
- Do not add a spec-local `AGENTS.md` merely to list or route artifacts.

## Identifier And Traceability Rules

- Use `R-nnn` for requirements, `AC-nnn` for acceptance criteria, `Tnnn` for tasks, and `D-nnn` for decisions.
- IDs are unique within one spec directory, not across the project.
- Once referenced, do not renumber or reuse an ID. Append new IDs; retain cancelled items with their original ID and mark them cancelled.
- Treat links as many-to-many: one requirement may map to several criteria or tasks, and one criterion or task may cover several requirements.
- Use IDs only when cross-artifact traceability adds value. A small spec with no cross-file references may omit them.

## Large Task Sets

- Keep one `tasks.md` checklist while it remains within the active document budget.
- Before crossing that budget, keep `tasks.md` as the execution index and move phase or workstream checklists to `tasks/<nn>-<phase-name>.md`.
- Keep active task, blockers, phase routing, cross-phase dependencies, and final completion gates in `tasks.md`.
- Store each task checkbox in exactly one canonical file; never copy phase checkboxes into the index.
- Keep task IDs unique and stable across the entire spec directory.
- Read `tasks.md` first, then only the active or dependency-relevant phase file; do not scan all task files by default.
- Split by independently verifiable phase or workstream, not arbitrary line ranges, and do not store live task state under `refs/`.
