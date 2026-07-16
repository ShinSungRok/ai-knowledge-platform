# tests/

Test layout reserved for future phases.

| Directory | Intent |
|---|---|
| `unit/` | Isolated unit tests for pure domain/application logic |
| `integration/` | Cross-module tests against fakes/in-memory adapters |
| `e2e/` | End-to-end flows (HTTP + composition), still without external services by default |

## Current approach (Task 1)

Architectural and contract checks run via **validation runners** under
`scripts/` (and later `app/knowledge/**/run*Validation.ts`), following
Project1. Prefer those for dependency-free, CI-friendly assertions until a
formal test runner is introduced deliberately.
