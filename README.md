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

Post-baseline Sprints 21–30 add **Partial** infrastructure adapters (Fake-
validated; live optional via env). Default `pnpm validate` remains
**dependency-free** (Fake / in-memory / SqlVectorIndex — no Docker, network,
or API keys required).

```bash
pnpm install
pnpm validate
pnpm validate:project:closeout
```

## Local runtime

In-process operations entry (dispatch only, no TCP). Cited-answer requires
`Authorization: Bearer <api-key>`; `/health` stays public:

```ts
import { createOperationsKnowledgeServer } from "./app/knowledge";

const { server, composition, logger, metrics } =
  createOperationsKnowledgeServer({
    apiKeys: {
      "demo-key": { subject: "demo-user", workspaceId: "workspace-a" },
    },
  });
await server.start();
await server.dispatch({
  method: "POST",
  path: "/workspaces/workspace-a/cited-answers",
  headers: { Authorization: "Bearer demo-key" },
  body: { query: "example" },
});
await server.stop();
```

TCP listen via built-in `node:http` (default validate uses `127.0.0.1:0`):

```ts
import { createListeningOperationsServer } from "./app/knowledge";

const listening = createListeningOperationsServer({
  apiKeys: {
    "demo-key": { subject: "demo-user", workspaceId: "workspace-a" },
  },
});
const { host, port } = await listening.start();
// GET http://127.0.0.1:<port>/health  (no auth)
// POST .../cited-answers with Authorization: Bearer demo-key
await fetch(`http://127.0.0.1:${port}/mcp`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    Authorization: "Bearer demo-key",
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
await listening.stop();
```

Pass `{ listen: { host: "127.0.0.1", port: 8080 } }` for an explicit port in
local/production use. Baseline without observability wrapping:
`createInMemoryKnowledgeServer` / `createInMemoryKnowledgeComposition`.

Default composition uses `FakeLanguageModelProvider` (no network). Optional
OpenAI-compatible HTTP LLM:

```ts
import {
  createInMemoryKnowledgeComposition,
  loadLlmHttpProviderConfig,
} from "./app/knowledge";

const composition = createInMemoryKnowledgeComposition(undefined, {
  llm: {
    type: "http",
    config: loadLlmHttpProviderConfig({
      baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.LLM_API_KEY!,
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    }),
  },
});
```

Optional live smoke (skipped when `LLM_API_KEY` is unset; not in `pnpm validate`):

```bash
pnpm validate:ai:http-provider-live
LLM_API_KEY=sk-... pnpm validate:ai:http-provider-live
```

Default operations observability is `InMemoryLogger` / `InMemoryMetrics`.
When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the HTTP router wraps those sinks
with OTLP/HTTP exporters (`flushObservability()` after work). Official
OpenTelemetry SDK remains unused.

```bash
# optional live OTLP smoke (skipped when endpoint unset; not in pnpm validate)
pnpm validate:observability:otlp-live
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  OTEL_SERVICE_NAME=ai-knowledge-platform \
  pnpm validate:observability:otlp-live
```

Optional OpenSearch VectorIndex (SQL documents/chunks remain Source of Truth;
OpenSearch is a rebuildable search index only). Default `pnpm validate` uses
Fake transport / `SqlVectorIndex` — no live cluster required.

```ts
import {
  createOpenSearchKnowledgeComposition,
  createOpenSearchVectorIndexFromEnv,
  createFakeOpenSearchOption,
  loadOpenSearchClientConfig,
} from "./app/knowledge";

// dependency-free composition smoke
const composition = createOpenSearchKnowledgeComposition(undefined, {
  openSearch: createFakeOpenSearchOption(),
});

// live when OPENSEARCH_URL is set
const liveIndex = createOpenSearchVectorIndexFromEnv(process.env);
```

```bash
# Fake transport (in pnpm validate)
pnpm validate:embedding:opensearch-index
pnpm validate:composition:opensearch-knowledge

# optional live cluster (skipped without OPENSEARCH_URL; not in pnpm validate)
pnpm validate:embedding:opensearch-live
OPENSEARCH_URL=http://localhost:9200 \
  OPENSEARCH_INDEX=knowledge-embeddings \
  pnpm validate:embedding:opensearch-live
```

## Still deferred by design (nested)

Partial adapters above are Fake-validated. These remain out of scope by design:

- Official SDKs (`@opentelemetry/*`, OpenSearch JS, LLM vendor SDKs, MCP SDK)
- MCP stdio; Express / Fastify
- JWT / OIDC AuthN; Prometheus scrape; distributed tracing
- Live Postgres/OpenSearch/LLM/OTLP as the **default** validate path
  (optional live runners skip when env is unset)

See [`docs/portfolio.md`](docs/portfolio.md) § Post-baseline infrastructure
(Partial) and intentional non-goals.

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

Nested deferrals (official SDKs, JWT/OIDC, Prometheus, tracing, Express,
MCP stdio) belong to later productization. Project 2 Charter baseline and
post-baseline Partial adapters are documented in
[`docs/portfolio.md`](docs/portfolio.md). See
[`docs/development.md`](docs/development.md).
