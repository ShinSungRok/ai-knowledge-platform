# Deployment

## 1. Purpose

Deployment and local infrastructure notes for the AI Knowledge Platform.
Docker scaffolding and dependency-free deployment readiness validation are
available; production host/CI deploy pipelines are not yet wired.

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

## 5. Current limitations

- No production host, CI deploy pipeline, or secrets management yet.
- Compose services are placeholders aligned with Project1's infra shape.
- No real Express/node:http listen; dispatch is in-process only.
- OpenTelemetry/Prometheus exporters are not included.
