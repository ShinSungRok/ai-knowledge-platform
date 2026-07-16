# Deployment

## 1. Purpose

Deployment and local infrastructure notes for the AI Knowledge Platform.
Task 1 ships Docker scaffolding only — nothing is production-running yet.

## 2. Local infrastructure (skeleton)

Compose and image definitions live under `docker/`:

```bash
docker compose -f docker/docker-compose.yml config
```

Planned services (not required for Task 1 validation):

| Service | Role |
|---|---|
| PostgreSQL | Source-of-truth document store |
| OpenSearch | Search / vector index |

## 3. Application image (skeleton)

`docker/Dockerfile` is a multi-stage Node/pnpm skeleton. It is not built or
published as part of Task 1.

## 4. Current limitations

- No production host, CI deploy pipeline, or secrets management yet.
- Compose services are placeholders aligned with Project1's infra shape.
- Application runtime entrypoint (`app/knowledge/server`) is not implemented.
