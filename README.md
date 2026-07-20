# AI Knowledge Platform

Production-shaped TypeScript backend for knowledge retrieval and grounded Q&A.
**Project 2 Platform Baseline is complete**: workspace-scoped knowledge through
cited RAG answers, MCP/tool/agent/memory/jobs, evaluation, in-process runtime,
and operations foundations — all proven by dependency-free validation runners
against fake/in-memory adapters.

Architecture philosophy is inherited from Project1 (`public-law-ai`): **Clean /
Hexagonal Architecture** with **Domain-Driven Design** boundaries, a single
composition root, and dependency-free validation runners.

## Status

**Project 2 Platform Baseline — closed (Sprint 20).**
Charter capabilities through Operations are implemented and documented. See
[`docs/portfolio.md`](docs/portfolio.md) and
[`docs/progress/PROJECT02_ROADMAP_STATUS.md`](docs/progress/PROJECT02_ROADMAP_STATUS.md).

```bash
pnpm install
pnpm validate
pnpm validate:project:closeout
```

## Local runtime

In-process operations entry (dispatch only, no TCP):

```ts
import { createOperationsKnowledgeServer } from "./app/knowledge";

const { server, composition, logger, metrics } =
  createOperationsKnowledgeServer();
await server.start();
// server.dispatch({ method, path, headers, body })
await server.stop();
```

TCP listen via built-in `node:http` (default validate uses `127.0.0.1:0`):

```ts
import { createListeningOperationsServer } from "./app/knowledge";

const listening = createListeningOperationsServer();
const { host, port } = await listening.start();
// GET http://127.0.0.1:<port>/health
await listening.stop();
```

Pass `{ listen: { host: "127.0.0.1", port: 8080 } }` for an explicit port in
local/production use. Baseline without observability wrapping:
`createInMemoryKnowledgeServer` / `createInMemoryKnowledgeComposition`.

## Deferred infrastructure

- Real Postgres / OpenSearch adapters (SQL/Fake paths validated; real `pg`
  live optional; OpenSearch client deferred)
- Real LLM SDK and MCP network transport
- Express/Fastify, AuthN / OTel exporters (`NodeHttpListener` is available)

## Layout

```
app/knowledge/     Clean / Hexagonal modules (platform baseline)
docs/              architecture, modules, development, deployment, portfolio
tests/             unit case inventories + placeholders
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
| `pnpm validate` | Full dependency-free platform validation chain + typecheck |
| `pnpm validate:project:closeout` | Static Project 2 baseline docs/scripts/exports closeout |
| `pnpm validate:skeleton` | Directory, barrel, docs, and script integrity |
| `pnpm typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `pnpm validate:deployment:readiness` | Static Docker/docs/export readiness (no daemon) |
| `pnpm infra:config` | `docker compose ... config` (requires Docker daemon) |

## Dependencies

Minimized for the platform baseline:

- `typescript`, `tsx`, `@types/node` (dev only)
- No runtime framework, database, search, or AI SDK

## Next

Infrastructure adapters and productization belong to later phases. Project 2
closeout does not start Project 3. See [`docs/development.md`](docs/development.md).
