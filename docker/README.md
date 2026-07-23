# docker/

Local infrastructure and application image scaffolding.

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Node/pnpm image; runner CMD `pnpm start` |
| `docker-compose.yml` | `app` (InMemory host) + PostgreSQL + OpenSearch; `app-full` profile |

Default `pnpm validate` does **not** require Docker build/up.

```bash
pnpm validate:skeleton
pnpm validate:deployment:readiness   # static, daemon-free
pnpm infra:config                    # docker compose config (needs daemon)
```

## App-only (InMemory)

```bash
docker compose -f docker/docker-compose.yml up app --build
# health: http://127.0.0.1:8080/health
# cited-answers: Authorization: Bearer demo-key
```

## Infra only (as before)

```bash
docker compose -f docker/docker-compose.yml up -d postgres opensearch
```

OpenSearch on `9200` for optional live VectorIndex checks. Postgres for
optional live SoT (`DATABASE_URL`). Default validate uses Fake transports.

```bash
OPENSEARCH_URL=http://localhost:9200 \
  OPENSEARCH_INDEX=knowledge-embeddings \
  pnpm validate:embedding:opensearch-live
```

## Full stack (Postgres + OpenSearch + app)

```bash
docker compose -f docker/docker-compose.yml --profile full \
  up app-full postgres opensearch --build
```

`app-full` sets `DATABASE_URL` / `OPENSEARCH_URL` to compose DNS and waits
for healthy postgres/opensearch. Do not run `app` and `app-full` together
(same host port 8080).

Optional Basic auth for OpenSearch when security is enabled:
`OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`.
