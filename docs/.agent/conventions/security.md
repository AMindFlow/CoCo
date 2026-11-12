---
summary: Protects security, privacy, external-service, and production-configuration boundaries.
read_when:
  - changing authentication, authorization, permissions, credentials, or secret handling
  - changing user-data exposure, privacy behavior, telemetry, or analytics
  - adding external services or changing network, deployment, or production configuration
---

# Security Boundaries

## Rules

- Do not add, expose, print, commit, or move secrets.
- Do not introduce new external services, network calls, telemetry, analytics, or third-party integrations without explicit approval.
- Do not weaken authentication, authorization, validation, escaping, rate limiting, auditability, or permission checks.
- Classify auth, secrets, user data, financial data, file deletion, migrations, and production config as high-risk.
- Prefer explicit allowlists and least-privilege access boundaries over broad permissions.

## Completion Evidence Additions

When this file applies, report:

- security boundary touched
- approval status for new external behavior
- validation or manual review performed
- residual security risk
