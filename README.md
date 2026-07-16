# AI Knowledge Platform

Production-shaped TypeScript **project skeleton** for a knowledge retrieval and
grounded Q&A backend. Task 1 establishes structure and architectural boundaries
only — no product features are implemented yet.

Architecture philosophy is inherited from Project1 (`public-law-ai`): **Clean /
Hexagonal Architecture** with **Domain-Driven Design** boundaries, a single
composition root, and dependency-free validation runners.

## Status

**Task 11 — Workspace-scoped knowledge source registry.**
`KnowledgeSource` (`workspaceId`, `id`, `name`) can be registered via
`CreateKnowledgeSourceUseCase` and `DefaultInMemoryKnowledgeSourceRepository`,
with the same workspace isolation as knowledge documents. Validate with:

```bash
pnpm install
pnpm validate
```

## Layout

```
app/knowledge/     Clean / Hexagonal module boundaries (skeleton barrels)
docs/              architecture, modules, development, deployment, portfolio
tests/             unit / integration / e2e placeholders
scripts/           validation runners (tsx)
docker/            Dockerfile + compose scaffolding
.cursor/rules/     persistent agent coding rules
.agents/skills/    project agent skills
```

## Architecture (summary)

- `domain` has zero outward dependencies.
- Business logic depends on **ports** (interfaces), never concrete adapters.
- `composition` is the only place allowed to wire every concrete adapter.
- Cross-cutting modules (`evaluation`, `observability`, `reliability`,
  `security`) depend downward; production business modules do not depend on them.

See [`docs/architecture.md`](docs/architecture.md) and
[`docs/modules.md`](docs/modules.md).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm validate:skeleton` | Assert directory, barrel, docs, and script integrity |
| `pnpm validate:repository` | DefaultInMemoryRepository port contract |
| `pnpm validate:repository:source` | DefaultInMemoryKnowledgeSourceRepository port contract |
| `pnpm validate:application` | List + Page + Create + Update + Delete + Search + Export knowledge document use cases + Create knowledge source use case |
| `pnpm typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `pnpm validate` | skeleton + repository + repository:source + application + typecheck |
| `pnpm infra:config` | `docker compose ... config` (optional) |

## Dependencies

Minimized on purpose for Task 1:

- `typescript`, `tsx`, `@types/node` (dev only)
- No runtime framework, database, search, or AI SDK yet

## Roadmap

Features (domain model, retrieval, RAG, HTTP, evaluation, etc.) land in later
phases, each with its own validation runner and docs update. See
[`docs/development.md`](docs/development.md) and
[`docs/portfolio.md`](docs/portfolio.md).
