---
summary: Prevents destructive, irreversible, or backward-incompatible changes to persisted state.
read_when:
  - changing schemas, migrations, seed data, fixtures, or persisted-state formats
  - changing import/export behavior, storage paths, retention, or user-owned data
  - planning destructive or backward-incompatible data changes
---

# Data And Migration Safety

## Rules

- Do not create destructive migrations without explicit user approval.
- Prefer backward-compatible migrations.
- Do not drop, rename, overwrite, truncate, or rewrite persisted data unless explicitly required.
- Do not modify production-like data, seed data, or fixtures unless the task requires it.
- Do not change data contracts without updating relevant specs and validation.
- Do not change storage paths or retention behavior without documenting migration and rollback implications.

## Schema Changes

For schema changes, define:

- forward migration
- backward compatibility behavior
- rollback notes
- validation query or test

## Import And Export Changes

For import/export changes, define:

- input format
- output format
- malformed data behavior
- idempotency expectations
- compatibility with existing data

## High-Risk Data Changes

Classify the task as high-risk when it involves:

- destructive migrations
- irreversible transformations
- production config
- user-owned data
- financial records
- auth/session data
- permission data
- audit logs
- bulk data rewrites

High-risk data changes require explicit user approval before implementation.

## Completion Evidence Additions

When this file applies, report:

- data structures or persisted state affected
- migration or compatibility strategy
- validation performed
- rollback notes
- unresolved data risks
