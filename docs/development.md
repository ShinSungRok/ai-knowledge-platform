# Development Guide

## 1. Local development

```bash
pnpm install
pnpm typecheck
pnpm validate:skeleton
```

No external services, API keys, or Docker are required for skeleton validation.

## 2. Validation workflow

This repository follows Project1's validation philosophy: correctness is proven
by **dependency-free runners** (plain `tsx` scripts) that assert invariants and
exit non-zero on failure.

Current validators:

```bash
pnpm validate:skeleton         # directory + barrel + docs integrity
pnpm validate:repository       # DefaultInMemoryRepository port contract
pnpm validate:repository:source # DefaultInMemoryKnowledgeSourceRepository port contract
pnpm validate:application      # List + Page + Create + Update + Delete + Search + Export + Source use cases
pnpm validate:pipeline:connector # FakeKnowledgeSourceConnector port contract
pnpm typecheck                 # TypeScript strict check
pnpm validate                  # skeleton + repository + repository:source + application + pipeline:connector + typecheck
```

Formal unit/integration/e2e suites under `tests/` are reserved for later
phases. Prefer validation runners for architectural and contract checks.

## 3. Commit strategy

- One focused commit per task.
- Conventional Commits (`feat(scope):`, `chore(scope):`, `docs(scope):`).
- Never mark a task done before its required `pnpm validate*` / `pnpm typecheck`
  commands pass.

## 4. Phase strategy

Each phase:

1. Has one explicit **goal** and an explicit **non-goal** list.
2. Adds modules/files following interface + implementation patterns
   (`docs/architecture.md`).
3. Ships its own validation runner(s), using only fakes/in-memory adapters.
4. Is documented under `docs/` as part of the same commit that closes it.
5. Does not wire new capability into production runtime until an explicitly
   scoped later phase.

## 5. Coding principles

- **Interfaces before implementations.**
- **Composition root owns wiring.**
- **No external libraries for problems this repo already owns** (retry,
  timeout, circuit breaker, rate limiting, logging/metrics — when introduced).
- **Deterministic by default** — injectable clocks/delays for time-based logic.
- **Document limits, not just capabilities.**
