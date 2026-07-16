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
