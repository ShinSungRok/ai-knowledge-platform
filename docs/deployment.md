# Deployment

## 1. Purpose

Deployment and local infrastructure notes for the AI Knowledge Platform.
Docker scaffolding and dependency-free deployment readiness validation are
available; production host/CI deploy pipelines are not yet wired.

**Project 2 closeout criteria:** operations-ready in-memory server
(`createOperationsKnowledgeServer`) plus `pnpm validate:deployment:readiness`
(static, Docker-daemon-free). Together with `pnpm validate`, these define the
Platform Baseline deployment readiness bar for Project 2.

**Default `pnpm validate` remains dependency-free** (Fake / in-memory adapters;
no live Postgres, OpenSearch, LLM, or OTLP collector required). Optional live
runners skip when env is unset and are not in top-level validate.

Nested expansion (Sprints 32–35, Partial): optional JWT (`JWT_SECRET` /
`JWT_JWKS_URL`), Prometheus `GET /metrics`, OTLP traces when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set, and local MCP stdio (`pnpm mcp:stdio`).
HTTP `POST /mcp` remains the default network path; default AuthN remains ApiKey.

### Post-baseline optional env (summary)

| Env | Role |
|---|---|
| `DATABASE_URL` | Optional live Postgres (`PostgresSqlGateway` / `validate:infra:postgres-live`) |
| `OPENSEARCH_URL` / `OPENSEARCH_INDEX` | Optional live OpenSearch VectorIndex |
| `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD` | Optional Basic auth for OpenSearch |
| `LLM_API_KEY` (and related `LLM_*`) | Optional HTTP LLM (`HttpLanguageModelProvider`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional OTLP/HTTP log+metrics+traces export |
| `JWT_SECRET` / `JWT_JWKS_URL` | Optional JWT AuthN (`auth` option or `createOperationsKnowledgeServerFromEnv`) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Optional JWT claim validation |
| API keys / Bearer | Default operations/listening AuthN (`apiKeys` map) |

## 2. Local infrastructure (skeleton)

Compose and image definitions live under `docker/`:

```bash
docker compose -f docker/docker-compose.yml config
# or
pnpm infra:config
```

`pnpm infra:config` requires a Docker daemon. For daemon-free structural
checks use:

```bash
pnpm validate:deployment:readiness
```

Planned services (not required for default `pnpm validate` beyond static
readiness checks):

| Service | Role |
|---|---|
| PostgreSQL | Source-of-truth document store |
| OpenSearch | Search / vector index |

## 3. Application image

`docker/Dockerfile` is a multi-stage Node/pnpm image (`deps` / `builder` /
`runner`). The runner stage defaults to `pnpm start` (listening operations
host on `HOST=0.0.0.0` / `PORT=8080`, InMemory + Fake LLM). Optional
`DATABASE_URL` / `OPENSEARCH_URL` / `LLM_API_KEY` follow the host env matrix.
Not built as part of default `pnpm validate`.

## 4. Operations-ready in-memory server

For local Operations exercises without TCP listen:

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

`createOperationsKnowledgeServer` wires in-memory composition, Bearer
AuthN (`Authorization: Bearer <api-key>`) plus workspace AuthZ,
`ObservingHttpRouter` (request logs +
`http.requests` metrics), and `DefaultKnowledgeServer`. `apiKeys` is required.

Baseline without observability wrapping remains
`createInMemoryKnowledgeServer`.

This in-process runtime path is the Project 2 closeout local runtime entry.
For TCP listen use `createListeningOperationsServer` (below).

## 4b. Listening operations server (`node:http`)

```ts
import { createListeningOperationsServer } from "./app/knowledge";

const listening = createListeningOperationsServer({
  apiKeys: {
    "demo-key": { subject: "demo-user", workspaceId: "workspace-a" },
  },
  // default: { host: "127.0.0.1", port: 0 } — ephemeral; specify port in prod
  listen: { host: "127.0.0.1", port: 0 },
});
const address = await listening.start();
// GET http://127.0.0.1:<address.port>/health  (public)
// POST /workspaces/workspace-a/cited-answers
//   Authorization: Bearer demo-key
await fetch(`http://127.0.0.1:${address.port}/mcp`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    Authorization: "Bearer demo-key",
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
await listening.stop();
```

`POST /mcp` accepts JSON-RPC `tools/list` and `tools/call` (Bearer required;
`tools/call` enforces `arguments.workspaceId` vs principal). HTTP `/mcp`
remains the default network path.

Local stdio MCP (newline-delimited JSON-RPC, no Bearer) is available via
`createInMemoryStdioMcpSession` / optional `pnpm mcp:stdio`. Official MCP SDK
remains deferred.

```bash
# one-line JSON-RPC over stdin/stdout (manual; not in pnpm validate)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm mcp:stdio
```

Default `pnpm validate` uses Fake stdio streams and loopback ephemeral ports
only (no Docker / external network). Express/Fastify are not used.

## 5. Knowledge schema (SqlGateway)

DDL for `knowledge_sources`, `knowledge_documents`, `document_chunks`, and
`embedding_vectors` (rebuildable search-index persistence used by
`SqlVectorIndex`; optional `OpenSearchVectorIndex` is a separate HTTP adapter)
lives in
`app/knowledge/infra/knowledgeSchemaSql.ts`. Apply via any `SqlGateway`:

```ts
import { applyKnowledgeSchema, InMemorySqlGateway } from "./app/knowledge";

const gateway = new InMemorySqlGateway();
await applyKnowledgeSchema(gateway);
```

`CREATE TABLE IF NOT EXISTS` makes re-apply safe. Default `pnpm validate`
uses `InMemorySqlGateway` / `FakePostgresPool` paths and does not open a
live Postgres connection. `PostgresSqlGateway` accepts an injected
`PostgresPool` (`pg.Pool`) for optional real-driver use.

Optional live smoke (not part of default validate):

```bash
# skip (exit 0) when unset
pnpm validate:infra:postgres-live

DATABASE_URL=postgres://user:pass@localhost:5432/knowledge \
  pnpm validate:infra:postgres-live
```

Pool-injected composition:

```ts
import { Pool } from "pg";
import { createPostgresKnowledgeComposition } from "./app/knowledge";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const composition = await createPostgresKnowledgeComposition({ pool });
// caller owns pool.end()
```

## 5b. Optional HTTP LLM provider

Default composition/operations use `FakeLanguageModelProvider` (no network).
To use an OpenAI-compatible HTTP provider:

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

`operations` / `listening` factories accept the same optional `llm` field.
Optional live smoke (not in top-level `pnpm validate`):

```bash
# skip (exit 0) when unset
pnpm validate:ai:http-provider-live

LLM_API_KEY=sk-... pnpm validate:ai:http-provider-live
```

## 5c. Optional OTLP/HTTP observability export

Default operations/listening servers use `InMemoryLogger` / `InMemoryMetrics`
only, with tracing off. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the same
sinks are wrapped with `ExportingLogger` / `ExportingMetrics`, and an
`ExportingTracer` is passed to `ObservingHttpRouter` for HTTP spans.
`flushObservability()` pushes buffered logs, metric snapshots, and traces
(`/v1/logs`, `/v1/metrics`, `/v1/traces`).

| Env | Role |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector base URL (required to enable) |
| `OTEL_SERVICE_NAME` | Defaults to `ai-knowledge-platform` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional `key=value,key2=value2` |

```bash
# skip (exit 0) when unset; not in top-level pnpm validate
pnpm validate:observability:otlp-live

OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  OTEL_SERVICE_NAME=ai-knowledge-platform \
  pnpm validate:observability:otlp-live
```

Official `@opentelemetry/*` SDK and full W3C propagator suite remain deferred.
HTTP tracing is enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (minimal
`traceparent` parent continuation). Prometheus text scrape is available at
`GET /metrics` on `ObservingHttpRouter` (dependency-free; no `prom-client`).

## 5d. OpenSearch VectorIndex (optional)

`OpenSearchVectorIndex` implements `VectorIndex` over a dependency-free HTTP
transport (no official OpenSearch JS SDK). Documents/chunks stay on SQL SoT;
OpenSearch holds only the rebuildable vector search index.

| Variable | Meaning |
|---|---|
| `OPENSEARCH_URL` | Cluster base URL (required to enable) |
| `OPENSEARCH_INDEX` | Index name (default `knowledge-embeddings`) |
| `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD` | Optional Basic auth |

Default `pnpm validate` uses Fake transport / `SqlVectorIndex` and does not
require a live cluster. Optional composition:
`createOpenSearchKnowledgeComposition` (inject Fake or Fetch transport).

```bash
pnpm validate:embedding:opensearch-index
pnpm validate:composition:opensearch-knowledge

# skip (exit 0) when OPENSEARCH_URL unset; not in top-level validate
pnpm validate:embedding:opensearch-live
OPENSEARCH_URL=http://localhost:9200 pnpm validate:embedding:opensearch-live
```

## 5e. Optional JWT AuthN

Default operations/listening use static API keys (`apiKeys`). Optional JWT
uses dependency-free Node `crypto` verifiers (no `jsonwebtoken`/`jose` SDK).

| Variable | Meaning |
|---|---|
| `JWT_SECRET` | HS256 shared secret (enables JWT when using env factory) |
| `JWT_JWKS_URL` | JWKS endpoint for RS256 (used when `JWT_SECRET` unset) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Optional claim validation |
| `workspace_id` claim | Required custom claim mapping to `AuthPrincipal.workspaceId` |

Explicit composition:

```ts
import { createOperationsKnowledgeServer } from "./app/knowledge";

createOperationsKnowledgeServer({
  auth: { type: "jwt", config: { type: "hs256", secret: process.env.JWT_SECRET! } },
});
```

Or env-driven factory (JWT when `JWT_SECRET` or `JWT_JWKS_URL` is set):

```ts
import { createOperationsKnowledgeServerFromEnv } from "./app/knowledge";

createOperationsKnowledgeServerFromEnv({ apiKeys: { /* fallback when no JWT env */ } });
```

```bash
pnpm validate:composition:jwt-auth
```

## 6. Current limitations

- No production host, CI deploy pipeline, or secrets management yet.
- Compose services are placeholders aligned with Project1's infra shape.
- Express/Fastify not used; TCP listen is `NodeHttpListener` (`node:http`).
- API Key/Bearer AuthN is default for cited-answer; optional JWT via
  `auth: { type: "jwt", config }` or `createOperationsKnowledgeServerFromEnv`
  when `JWT_SECRET`/`JWT_JWKS_URL` is set. JWT must include `workspace_id`
  claim. Full OIDC login flows and official JWT SDKs remain deferred.
- HTTP LLM is optional; default composition remains Fake (no official LLM SDK).
- OTLP/HTTP log+metrics+traces export is optional via env; official OTel SDK /
  full W3C propagator suite are not included. Prometheus text scrape is
  exposed at `GET /metrics` (no `prom-client`).
- OpenSearch VectorIndex is optional via env/Fake; official OpenSearch SDK
  remains deferred; default composition stays InMemory/`SqlVectorIndex`.
