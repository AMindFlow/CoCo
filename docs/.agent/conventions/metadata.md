---
summary: Defines metadata structure, discovery matching, authoring rules, and exceptions for governed Markdown documents.
read_when:
  - creating or changing a governed Markdown document
  - resolving missing, malformed, ambiguous, or stale document metadata
  - changing metadata discovery behavior or governed-document scope
---

# Metadata Convention

## Purpose

Metadata is the compact discovery surface used before an agent loads or edits a document body. Filenames and directory names identify candidates; metadata confirms which candidates can answer the current task.

## Format

Governed documents start with exactly these discovery fields:

```yaml
---
summary: Defines required test levels, regression coverage, and evidence for behavior changes.
read_when:
  - adding or changing externally observable behavior
  - fixing a regression
  - changing concurrency, retry, or failure-handling logic
---
```

- `summary` is one declarative sentence, on one line, no more than 160 characters. State what useful rules, facts, or decisions the body contains.
- `read_when` is a YAML list of one to five concrete task conditions. Keep each item to one line and no more than 120 characters.
- Use action or condition phrases that can be matched against task intent, touched paths, planned operations, or risk.
- Do not add `name`; the path and first heading already identify the document.
- Do not put policy detail, procedures, or mini-summaries of each section in frontmatter.

## Governed Documents

Apply this format to maintained Markdown documents intended for manual agent discovery, including:

- scoped `AGENTS.md` files
- agent conventions and operational references
- shared project and workflow documents
- reusable document templates

Exceptions:

- repository-root `AGENTS.md`, because the runtime loads it before manual discovery
- `SKILL.md` and other platform files with a required metadata schema
- thin platform aliases such as `CLAUDE.md` and `GEMINI.md`
- standard SDD artifacts under `docs/specs/<lifecycle>/<feature-slice-name>/`, whose scoped contract defines stable roles
- generated or archived documents that are not active discovery targets
- immutable user-supplied requirement snapshots under `docs/requirements/sources/`, routed by their maintained index rather than loaded by default

## Discovery Process

1. Decompose the task into domains, artifacts, operations, and risks.
2. Use visible names to select a small set of candidate directories and files.
3. Along each candidate path, preview scoped `AGENTS.md` metadata from the outermost directory to the nearest. Load matching bodies only; absence of a scoped file is valid.
4. Preview candidate document metadata, including before editing an existing document, unless its scoped contract defines metadata-free structural routing.
5. Load only bodies with a matching `read_when`, then follow their canonical rules. Re-run discovery if task scope changes.

An explicit user reference is a direct match. A directory map, metadata result, or link identifies another candidate only; it never authorizes loading the target body or family automatically.

## Matching And Failure Rules

- Match triggers against the actual task and planned work, not topical word overlap alone.
- One concrete trigger match is enough to load that document; no match means stop after metadata preview.
- Treat malformed or missing metadata on a metadata-governed document as a gap, not permission to read broadly.
- For material or high-risk ambiguity, read the narrowest plausible body and report the gap. For lower-risk work, continue without widening the scan.
- If selected metadata and body disagree, follow the body for the current task and update both in the same documentation change.

## Authoring Rules

- Write or revise metadata before drafting or changing the body so the intended audience and trigger are explicit.
- Make `summary` distinguish the document from neighboring files; do not merely restate its title.
- Make every `read_when` item independently actionable; avoid phrases such as "when relevant", "when needed", or "when working in this directory".
- Describe why the body is needed, not where the file lives or which other files it links.
- Update metadata whenever the document's canonical responsibility or read triggers change.
- Do not create a scoped `AGENTS.md` only to route files whose names and metadata are sufficient.
- Do not add metadata to a standardized artifact family when its scoped contract already defines path and filename roles.

## Fast Preview

Preview only the opening frontmatter of a known candidate:

```bash
sed -n '1,/^---$/p' docs/<candidate>.md
```

Do not recursively preview every document by default.
