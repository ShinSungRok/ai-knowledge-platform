# docker/

Local infrastructure and application image scaffolding.

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Node/pnpm image skeleton |
| `docker-compose.yml` | PostgreSQL + OpenSearch for local infra |

Task 1 does not require Docker to validate the skeleton:

```bash
pnpm validate:skeleton
```

Optional compose check:

```bash
docker compose -f docker/docker-compose.yml config
```

OpenSearch in compose exposes `9200` for optional live VectorIndex checks.
Default `pnpm validate` uses Fake OpenSearch HTTP transport /
`SqlVectorIndex` and does not require the container.

```bash
# after compose up
OPENSEARCH_URL=http://localhost:9200 \
  OPENSEARCH_INDEX=knowledge-embeddings \
  pnpm validate:embedding:opensearch-live
```

Optional Basic auth env vars for the app (when security is enabled on the
cluster): `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`.

Postgres in compose is for optional live SoT checks (`DATABASE_URL`);
default `pnpm validate` does not require it.
