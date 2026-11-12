---
summary: Maps human and agent documentation entry points, directory ownership, and project-init placeholder boundaries.
read_when:
  - onboarding to the project documentation structure
  - locating the canonical home for project, workflow, spec, template, or agent-rule content
  - changing documentation directories or project-init placeholder ownership
---

# Documentation Map

This documentation map separates human reading paths from agent execution rules so projects can start lean and load detail only when needed.

## Human Entry Points

- `AGENTS.md`: thin root agent contract and compact project summary.
- `docs/project/overview.md`: stable project profile, value, boundaries, technology posture, architecture map, and document ownership.
- `docs/project/current-state.md`: changing baseline, active focus, open decisions, risks, and next-read candidates.
- `docs/workflow/`: human-facing workflow rules, includes SDD, VCS and Git.
- `docs/templates/`: reusable document templates, includes templates of SDD.
- `docs/specs/`: shared SDD artifacts organized under `spike/`, `official/`, `archived/`, and `superseded/`; new specs start in `spike/`.
- `docs/README.md`: this map.

Humans usually do not need to read `docs/.agent/**` unless they are changing agent behavior or reviewing the template itself.

## Agent Candidate Map

This map is itself optional. When selected, treat its entries as candidate locations, then apply the root metadata-first process rather than reading them in sequence.

- Root `AGENTS.md` already supplies universal classification, discovery, and completion rules.
- `docs/project/` is a candidate only when stable profile or changing project state matters.
- `docs/.agent/conventions/` contains focused rules selected by filename and metadata.
- `docs/workflow/` contains human-readable canonical workflows selected by matched conventions or operations.
- `docs/specs/` contains selected official standards or active spikes; artifact filenames determine purpose.

## Directory Roles

- `docs/.agent/`: agent-only routed rules and operational constraints.
- `docs/.agent/conventions/`: self-routing convention files with `summary` and `read_when` metadata.
- `docs/project/`: durable project profile and changing project state.
- `docs/workflow/`: human-facing canonical workflow docs.
- `docs/specs/`: metadata-free standard SDD artifacts grouped by lifecycle class, human-facing first.
- `docs/templates/`: reusable `spec.md`, `design.md`, `tasks.md`, and `decisions.md` templates copied or rendered into new projects.
