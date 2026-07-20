# Deployment

## 1. Purpose

Deployment and local infrastructure notes for the AI Knowledge Platform.
Docker scaffolding and dependency-free deployment readiness validation are
available; production host/CI deploy pipelines are not yet wired.

**Project 2 closeout criteria:** operations-ready in-memory server
(`createOperationsKnowledgeServer`) plus `pnpm validate:deployment:readiness`
(static, Docker-daemon-free). Together with `pnpm validate`, these define the
Platform Baseline deployment readiness bar for Project 2.

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

## 3. Application image (skeleton)

`docker/Dockerfile` is a multi-stage Node/pnpm skeleton (`deps` / `builder` /
`runner`). It is not built or published as part of default validation.

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
await listening.stop();
```

Default `pnpm validate` uses loopback ephemeral ports only (no Docker /
external network). Express/Fastify are not used.

## 5. Knowledge schema (SqlGateway)

DDL for `knowledge_sources`, `knowledge_documents`, `document_chunks`, and
`embedding_vectors` (rebuildable search-index persistence used by
`SqlVectorIndex`; OpenSearch still deferred) lives in
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

## 6. Current limitations

- No production host, CI deploy pipeline, or secrets management yet.
- Compose services are placeholders aligned with Project1's infra shape.
- Express/Fastify not used; TCP listen is `NodeHttpListener` (`node:http`).
- API Key/Bearer AuthN is wired for cited-answer; JWT/OIDC remain deferred.
- HTTP LLM is optional; default composition remains Fake (no official LLM SDK).
- OpenTelemetry/Prometheus exporters are not included.
