---
summary: Keeps tests aligned with intended behavior instead of weakening them to pass validation.
read_when:
  - creating, modifying, deleting, skipping, or rebaselining tests
  - changing assertions, fixtures, snapshots, coverage, or expected behavior in tests
  - resolving a failure by changing test expectations
---

# Test Integrity

## Rules

- Do not delete, weaken, skip, or rewrite tests merely to make validation pass.
- Test changes are allowed only when behavior requirements changed, existing tests are objectively wrong or outdated, or new coverage is required for changed behavior.
- When modifying tests, explain the requirement change or defect that justifies it.
- Prefer focused regression tests for bug fixes.
- Keep test fixtures minimal and representative.
- Independent test developers must derive expectations from the accepted behavior and public contract, not mirror implementation details solely to make coverage pass.
- Independent test developers may change only the test, fixture, and validation-artifact paths assigned in the validation contract; production-code failures return to the implementer.

## Completion Evidence Additions

When this file applies, report:

- tests added or changed
- behavior requirement covered
- tests removed, skipped, or weakened and why
- validation result
