# AGENTS.md

## Project Identity

`CoCo` is a project of type `事件驱动的多 Agent 软件交付协调工具（MCP 服务与规则、Skills 包）`. Durable project description, current state, and operating boundaries live under `docs/project/`.

New or changed project-owned documentation defaults to `中文`. Preserve code, identifiers, commands, quoted text, and externally required formats in their original language.

## Core Rules

- Never delete with `rm`; use `trash` when removal is required.
- Do not revert, overwrite, reformat, or broaden user changes unless explicitly asked.
- Keep changes scoped; avoid opportunistic refactors and public-name changes.
- Do not hardcode values that belong in configuration, content, or environment boundaries.
- Do not write local absolute paths into project files.
- Keep one canonical home per fact and link instead of duplicating detail.
- Do not create changelogs, handoffs, or status updates unless their canonical facts or next-read path changed.
- Do not claim completion without validation status.

## Task Routing

Classify conservatively before editing:

| Level | Trigger | Required control |
| --- | --- | --- |
| Trivial | Copy, comment, or formatting change with no behavior or structure impact | Targeted check when cheap |
| Small | Localized single-area change with limited impact | Brief plan and targeted validation |
| Small mechanical | Repeated multi-file edit with no behavior, interface, boundary, workflow, or documentation-system change | State the pattern and validate the affected scope |
| Material | Behavior, interface, architecture, data, workflow, build/test/deploy, documentation-system, or cross-boundary change | Approved spec, acceptance criteria, validation contract, and routed validation |
| High-risk | Auth, permissions, payments, secrets, migrations, production config, user data, destructive action, or irreversible automation | Material controls plus explicit approval, rollback plan, and required independent verification |

Multi-file scope alone does not make work Material. When uncertain, use the higher plausible level.

For Material or high-risk work, read `docs/.agent/conventions/validation.md` and `docs/workflow/sdd.md` before implementation. Read `docs/specs/AGENTS.md` when creating, changing, or splitting SDD artifacts. Do not implement a draft spec. Agents may stop at `Implementation: complete`; only a human may set `verified`.

## Candidate Discovery

1. Identify task domains, artifacts, operations, touched paths, and risks.
2. Use visible names to select a small candidate set; do not inventory the repository recursively.
3. Along each candidate path, preview scoped `AGENTS.md` metadata outermost to nearest and load only matching bodies. Absence means no extra directory rule.
4. Preview candidate document metadata before its body. Follow standardized filename contracts for metadata-free artifacts.
5. Treat explicit user references as matches; treat maps, links, current state, and directory contents only as candidates.

Do not scan all conventions or specs. Do not read `archived/` or `superseded/` by default; follow `docs/workflow/sdd.md` for allowed historical-use cases. Re-run discovery only when scope or risk changes. Read `metadata.md` only when authoring metadata or resolving a metadata defect.

## Documentation And SDD

- Before creating a document, identify its canonical home, reader, read trigger, and lifecycle; otherwise update an existing document or do not write one.
- Update docs for changed behavior, boundaries, workflows, decisions, setup, security assumptions, or active handoff paths, not routine internal edits.
- Use shared human-agent specs under `docs/specs/`; keep agent-only docs focused on routing and operational constraints.
- Add scoped `AGENTS.md` only for durable rules that metadata or standardized structure cannot express.
- Start new specs under `docs/specs/spike/`. Normalize accepted Plan Mode output into canonical SDD artifacts; retain raw output only for unique evidence.
- Let `workflow/sdd.md` own lifecycle state and `docs/specs/AGENTS.md` own artifact structure.

## Completion Evidence

Always report outcome and validation results or skipped checks. Add only the fields required by the task level:

- **Small:** changed area and any known limitation.
- **Small mechanical:** applied pattern, affected scope, and exceptions.
- **Material:** governing spec and states, changes by purpose, acceptance results, independent verification or fallback, pending human verification, and remaining risk.
- **High-risk:** Material evidence plus approval, rollback status, waiver if any, and residual risk.

Include non-duplicate additions from matched conventions. Omit empty sections.
