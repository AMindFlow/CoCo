---
summary: Defines pre-implementation validation contracts, risk-based checks, and independent-agent verification gates.
read_when:
  - planning or implementing a material or high-risk change
  - changing build, configuration, dependencies, tests, deployment, or workflow behavior
  - assigning an independent agent to plan tests, develop tests, review, or verify
  - deciding validation scope, pass conditions, fallback, or waiver requirements
---

# Validation Policy

## SDD Boundary

`docs/workflow/sdd.md` owns review and implementation states. Technical or independent validation supplies evidence; it does not approve a draft or set a spec to `verified`.

## Validation Contract

Before implementing material or high-risk work, define acceptance in `spec.md` and validation design in `design.md`. When a change legitimately needs no design artifact, keep a brief validation contract in the explicit execution plan:

- acceptance criteria and affected behavior
- tests to add or change
- deterministic commands and manual checks
- pass conditions
- independent-verification level
- provider fallback or required waiver

Normalize accepted Plan Mode validation content into `design.md` when that file exists. Do not begin parallel implementation and test development until the contract is stable enough for both agents to work from the same expected behavior.

## Risk-Based Checks

- Documentation-only change: no runtime tests required unless docs contain executable examples.
- Localized code change: run targeted tests for touched behavior.
- Cross-module behavior change: run targeted tests plus relevant integration tests when available.
- Build/config/dependency change: run lint, typecheck, build, or equivalent project checks when available.
- Security/auth/data migration change: run relevant tests and include manual risk review notes.
- Do not invent commands. Infer commands from project files only when safe.
- If validation cannot run, report why.

## Independent Verification Gate

- Trivial, small mechanical, and ordinary documentation work do not require an independent agent.
- Small behavior changes may use an independent agent when uncertainty or regression risk justifies it.
- Material behavior, build, test, deploy, and workflow changes use an independent agent by default. If no provider is available or independent verification is inapplicable, self-validate and report the reason plus residual risk.
- High-risk work requires an independent agent. If it is unavailable or does not pass, do not claim completion unless the user explicitly accepts a waiver after reviewing the remaining risk.
- Use a separate agent or fresh agent session from the implementer. Agent identity alone is insufficient when it shares the implementation context and conclusions.

## Provider Selection

- Use Claude Code as the default independent-verification provider.
- Use OpenCode or another provider only when the user explicitly selects it.
- Do not silently replace an explicitly selected provider when it is unavailable; apply the task-risk fallback or waiver rule and report the reason.
- Apply the same role capability boundaries regardless of provider.

## Agent Roles And Capabilities

| Role | Required capabilities | Forbidden behavior |
| --- | --- | --- |
| Test planner | Read and search the accepted spec, baseline behavior, interfaces, and existing tests | Editing files or claiming tests were executed |
| Test developer | Read, search, edit agreed test/fixture files, and run deterministic test commands | Editing production code, changing requirements, or working in the implementer's worktree |
| Final verifier | Read, search, and run the agreed validation commands against the integrated final state | Editing source/tests, auto-fixing failures, or changing expected results |
| Static reviewer | Read and search code, docs, diffs, and artifacts | Claiming runtime validation without command evidence |

- Match the provider tool allowlist to the assigned role. `Read`, `Grep`, and `Glob` alone support planning or static review, not dynamic test validation.
- A test developer needs coding and command-execution capabilities, but only in an isolated workspace and only for the agreed test-owned paths.
- A final verifier needs command execution, such as a constrained shell tool, but must not receive source-editing tools. Test-created caches and generated reports are allowed when the agreed commands require them.
- Plan Mode output may define a validation strategy; it does not count as executed validation unless a command-capable agent later runs the checks.
- If the available provider cannot satisfy the assigned capability set, treat that role as unavailable and apply the risk-level fallback or waiver rule.

## Parallel Test Development

- Derive the initial test plan from the accepted spec, existing behavior, and public interfaces before reading the implementation patch.
- Give the test developer ownership of explicitly named tests, fixtures, and validation artifacts only.
- Follow `workspace.md` for isolated worktrees and integration ownership.
- If safe isolation is unavailable, do not let agents write concurrently; use sequential independent test design and verification.
- Do not weaken independently authored tests merely to make the implementation pass; follow `tests.md` for test-integrity rules.

## Final Verification

- Verify the integrated final state, not an implementation branch or stale patch.
- Run the deterministic commands defined before implementation and inspect the final diff against the acceptance criteria.
- Do not let the final verifier repair failures. Return findings to the implementer, then use a fresh verification run after fixes.
- A bare `PASS` statement is not evidence. Record commands or checks, exit status or observable result, acceptance-criteria coverage, and anything not verified.
- Prefer least-privilege tools and an isolated workspace when invoking a terminal agent such as Claude Code.
- Give the verifier task requirements and raw artifacts without leaking the implementer's conclusions or expected findings.

## Completion Evidence Additions

When this file applies, add:

- validation contract, checks, results, and skipped checks
- verifier provider, session boundary, capability, and acceptance coverage
- fallback or waiver, remaining validation risk, and human-verification state
