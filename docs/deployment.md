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
  createOperationsKnowledgeServer();
await server.start();
// dispatch HttpRequest values in-process; inspect logger/metrics
await server.stop();
```

`createOperationsKnowledgeServer` wires in-memory composition, workspace
HTTP guard (`x-workspace-id`), `ObservingHttpRouter` (request logs +
`http.requests` metrics), and `DefaultKnowledgeServer`.

Baseline without observability wrapping remains
`createInMemoryKnowledgeServer`.

This in-process runtime path is the Project 2 closeout local runtime entry
— not a production TCP listener.

## 5. Knowledge schema (SqlGateway)

DDL for `knowledge_sources`, `knowledge_documents`, `document_chunks`, and
`embedding_vectors` (rebuildable search-index persistence; OpenSearch still
deferred) lives in `app/knowledge/infra/knowledgeSchemaSql.ts`. Apply via any
`SqlGateway`:

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

## 6. Current limitations

- No production host, CI deploy pipeline, or secrets management yet.
- Compose services are placeholders aligned with Project1's infra shape.
- No real Express/node:http listen; dispatch is in-process only.
- OpenTelemetry/Prometheus exporters are not included.
