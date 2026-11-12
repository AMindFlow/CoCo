---
summary: Defines placeholder, synchronization, and artifact-separation rules for reusable documentation templates.
read_when:
  - creating or changing a reusable documentation template
  - adding placeholders or changing template ownership boundaries
  - synchronizing current and generated-project template copies
---

# AGENTS.md

## Scope

This directory contains reusable templates for humans, agents, and future project-init automation.

## Rules

- Keep templates generic and project-agnostic.
- Use angle-bracket placeholders only for values the template consumer should fill, such as `<Feature Slice Name>`.
- Do not store local absolute paths, credentials, private endpoint names, or machine-specific defaults in templates.
- Prefer short template prompts and checklists over long explanatory prose.
- Keep `spec.md`, `design.md`, `tasks.md`, and `decisions.md` responsibilities distinct; do not copy the same fact into multiple templates.
- Give each template metadata that routes agents to that template.
- When instantiating an SDD template, remove the template's discovery frontmatter; standard artifacts are routed by lifecycle path and filename.
- Create new spec directories under `docs/specs/spike/` unless the user explicitly selects another lifecycle class.
- Keep current-project and generated-project template copies synchronized.
- Update `docs/README.md` when adding a template that humans should discover.
