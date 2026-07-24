# AI Knowledge Platform

Production-shaped TypeScript **AI backend** platform: knowledge retrieval &
serving, multi-agent workflow engine, and LLMOps control plane.

| Layer | Name | Why |
|---|---|---|
| **P2** | Knowledge Retrieval & Serving Platform | Enterprise knowledge ingest → retrieve → serve |
| **P3** | Multi-Agent Workflow Engine | Complex work as role-based workflows |
| **P4** | LLMOps / Control Plane | Version, evaluate, deploy-config, observe |

**Why → What → How** portfolio narrative:
[`docs/PORTFOLIO_NARRATIVE.md`](docs/PORTFOLIO_NARRATIVE.md).  
P2 runbook: [`docs/P2_SERVICE_MANUAL.md`](docs/P2_SERVICE_MANUAL.md).  
P3 demo/runbook: [`docs/P3_WORKFLOW_ENGINE.md`](docs/P3_WORKFLOW_ENGINE.md)
(`pnpm demo:workflow:engine`, `pnpm demo:workflow:p2-bridge`,
`pnpm demo:workflow:evaluation`, `pnpm demo:workflow:evaluation-bridge`).  
P4 control-plane demo: [`docs/P4_LLMOPS.md`](docs/P4_LLMOPS.md)
(`pnpm demo:llmops:control-plane`).

**Project 2 baseline is complete** (cited RAG, MCP/agent/jobs, evaluation,
runtime/ops) with dependency-free validators. Architecture from Project1
(`public-law-ai`): Clean / Hexagonal / DDD, composition root, Fake-first
validation.

## Status

**Project 2: CLOSED** (Sprint 37). **Project 3: CLOSED (Partial)** (Sprint 44
closeout; five charter capabilities each Partial — none Completed).
**Project 4: CLOSED (Partial)** (Sprint 51 closeout; five LLMOps capabilities
each Partial — none Completed). Closeout script:
`pnpm validate:project04:closeout`.

**P2 Service Completion (human-authorized):** Phase A **Complete** (Sprint 57);
Phase B **Complete** (Sprint 58–61); track **Complete** (Sprint 61). Optional
HTTP LLM / Postgres / OpenSearch + compose `app` / `pnpm start`. Does not
reopen Project 2 charter CLOSED. P3/P4 product work frozen. No Project 5.
Partial infra adapters stay Partial.

| Track | Status |
|---|---|
| Charter Platform Baseline | CLOSED (Sprint 20) |
| Post-baseline Infrastructure | CLOSED (Partial) (Sprint 31) |
| Nested Deferral Expansion | CLOSED (Partial) (Sprint 36) |
| Project 3 Charter Skeleton | CLOSED (Sprint 38) |
| Project 3 Multi-Agent Role Contract | Partial (Sprint 39) |
| Project 3 Workflow Orchestrator | Partial (Sprint 40) |
| Project 3 Agent Handoff / Delegation | Partial (Sprint 41) |
| Project 3 Shared Workflow Memory | Partial (Sprint 42) |
| Project 3 Multi-Agent Evaluation | Partial (Sprint 43) |
| Project 3 overall | CLOSED (Partial) (Sprint 44) |
| Project 4 Charter Skeleton | CLOSED (Sprint 45) |
| Project 4 Experiment / Run Tracking | Partial (Sprint 46) |
| Project 4 Prompt & Model Registry | Partial (Sprint 47) |
| Project 4 Evaluation Gates / Regression Harness | Partial (Sprint 48) |
| Project 4 Deployment / Serving Configuration | Partial (Sprint 49) |
| Project 4 LLMOps Observability | Partial (Sprint 50) |
| Project 4 overall | CLOSED (Partial) (Sprint 51) |
| P2 Service Completion Phase A | Complete (Sprint 57) |
| P2 Service Completion Phase B | Complete (Sprint 61) |
| P2 Service Completion Track | Complete (Sprint 61) |

Charter capabilities through Operations are Completed. Partial infra adapters,
Project 3 Multi-Agent capabilities, and Project 4 LLMOps capabilities stay
Partial (not Completed). See
[`docs/portfolio.md`](docs/portfolio.md),
[`docs/progress/PROJECT02_ROADMAP_STATUS.md`](docs/progress/PROJECT02_ROADMAP_STATUS.md),
Project 3 docs:
[`docs/agent/PROJECT03_INSTRUCTIONS.md`](docs/agent/PROJECT03_INSTRUCTIONS.md),
[`docs/progress/PROJECT03_PROGRESS.md`](docs/progress/PROJECT03_PROGRESS.md),
[`docs/progress/PROJECT03_ROADMAP_STATUS.md`](docs/progress/PROJECT03_ROADMAP_STATUS.md),
and Project 4 docs:
[`docs/agent/PROJECT04_INSTRUCTIONS.md`](docs/agent/PROJECT04_INSTRUCTIONS.md),
[`docs/progress/PROJECT04_PROGRESS.md`](docs/progress/PROJECT04_PROGRESS.md),
[`docs/progress/PROJECT04_ROADMAP_STATUS.md`](docs/progress/PROJECT04_ROADMAP_STATUS.md).

Default `pnpm validate` remains **dependency-free** (Fake / in-memory /
SqlVectorIndex — no Docker, network, or API keys required).

```bash
pnpm install
pnpm validate
pnpm validate:project:closeout
pnpm validate:project:post-baseline-closeout
pnpm validate:project:nested-expansion-closeout
pnpm validate:project:final-closeout
pnpm validate:project03:charter-skeleton
# Project 3 Multi-Agent Partial evidence:
pnpm validate:workflow:contract
pnpm validate:workflow:registry
pnpm validate:workflow:orchestrator
pnpm validate:workflow:handoff
pnpm validate:workflow:memory
pnpm validate:workflow:evaluation
pnpm validate:application:eval-workflow
pnpm validate:project03:closeout
pnpm validate:project04:charter-skeleton
pnpm validate:project04:closeout
pnpm validate:llmops:contract
pnpm validate:llmops:run-store
pnpm validate:llmops:prompt-registry
pnpm validate:llmops:model-registry
pnpm validate:llmops:evaluation-gate
pnpm validate:llmops:regression-harness
pnpm validate:llmops:serving-config
pnpm validate:llmops:observation-store
```

## Local runtime

### P2 Service Completion Phase A/B (`pnpm start`)

터미널 실행 매뉴얼: [`docs/P2_SERVICE_MANUAL.md`](docs/P2_SERVICE_MANUAL.md)

Long-running HTTP host (`NodeHttpListener`, no Express).
**Phase A Complete** / **Phase B Complete** / track **Complete** (Sprint 61).
InMemory store + Fake LLM by default. Optional:

| Env combination | STORE | VECTOR |
|---|---|---|
| (none) | `inmemory` | `inmemory` |
| `DATABASE_URL` only | `postgres` | `sql` |
| `OPENSEARCH_URL` only | `opensearch` | `opensearch` |
| both | `postgres+opensearch` | `opensearch` |

Also: `LLM_API_KEY` → HTTP LLM. Host logs `STORE:` / `VECTOR:` / `LLM:`.
Demo seed unless `SKIP_DEMO_SEED=1`. See `.env.example`.

```bash
pnpm start
# optional:
# HOST=127.0.0.1 PORT=8080 API_KEY=demo-key WORKSPACE_ID=workspace-a pnpm start
# LLM_API_KEY=sk-... LLM_MODEL=gpt-4o-mini pnpm start
# docker compose -f docker/docker-compose.yml up -d postgres
# DATABASE_URL=postgres://knowledge:knowledge@127.0.0.1:5432/knowledge pnpm start
# docker compose -f docker/docker-compose.yml up -d opensearch
# OPENSEARCH_URL=http://127.0.0.1:9200 pnpm start
# DATABASE_URL=... OPENSEARCH_URL=http://127.0.0.1:9200 pnpm start
```

| Env | Default |
|---|---|
| `HOST` | `127.0.0.1` |
| `PORT` | `8080` |
| `API_KEY` | `demo-key` |
| `API_KEY_SUBJECT` | `demo-user` |
| `WORKSPACE_ID` | `workspace-a` |
| `SKIP_DEMO_SEED` | unset (seed on); `1` skips |
| `DATABASE_URL` | unset → no Postgres pool |
| `OPENSEARCH_URL` | unset → no OpenSearch VectorIndex |
| `OPENSEARCH_INDEX` | `knowledge-embeddings` |
| `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD` | optional Basic auth |
| `LLM_API_KEY` | unset → Fake LLM; set → HTTP LLM |
| `LLM_BASE_URL` | `https://api.openai.com/v1` (when HTTP) |
| `LLM_MODEL` | `gpt-4o-mini` (when HTTP) |
| `LLM_TIMEOUT_MS` | optional positive integer |

```bash
curl -sS http://127.0.0.1:8080/health
curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/cited-answers \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"query":"aaaaaaaa"}'
curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/workflow-runs \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"objective":"aaaaaaaa"}'
```

Smoke (ephemeral port, included in `pnpm validate`):

```bash
pnpm validate:server:start-smoke
pnpm validate:server:start-postgres-smoke
pnpm validate:server:start-opensearch-smoke
pnpm validate:server:start-postgres-opensearch-smoke
# optional live (skip exit 0 when unset; not in pnpm validate):
# LLM_API_KEY=sk-... pnpm validate:server:start-llm-live
# DATABASE_URL=postgres://... pnpm validate:server:start-postgres-live
# OPENSEARCH_URL=http://127.0.0.1:9200 pnpm validate:server:start-opensearch-live

# Compose (optional; not in pnpm validate):
# docker compose -f docker/docker-compose.yml up app --build
# docker compose -f docker/docker-compose.yml --profile full up app-full postgres opensearch --build
```

### In-process / library usage

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

HTTP `/mcp` remains the default network path. Local stdio MCP (no Bearer):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm mcp:stdio
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

Default operations observability is `InMemoryLogger` / `InMemoryMetrics`
(tracing off). When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the HTTP router wraps
those sinks with OTLP/HTTP exporters and enables `ExportingTracer` HTTP spans
(`/v1/logs`, `/v1/metrics`, `/v1/traces` via `flushObservability()`). Official
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
const composition = await createOpenSearchKnowledgeComposition(undefined, {
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

These remain **Project 2 non-goals** (by design). Partial adapters above are
Fake-validated and stay Partial — not Completed:

- Official SDKs (`@opentelemetry/*`, OpenSearch JS, LLM vendor SDKs, MCP SDK)
- Express / Fastify
- Full OIDC authorization-code login flows and JWT/OIDC SDKs (`jsonwebtoken`, `jose`, `passport`)
- Full W3C propagator suite / baggage (OTLP HTTP spans + minimal `traceparent` are implemented; `prom-client` deferred)
- Live Postgres/OpenSearch/LLM/OTLP as the **default** validate path
  (optional live runners skip when env is unset)

See [`docs/portfolio.md`](docs/portfolio.md) § Project 2 CLOSED, nested
expansion, and intentional non-goals.

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
| `pnpm validate:project:post-baseline-closeout` | Static Sprints 21–30 Partial infra evidence closeout |
| `pnpm validate:project:nested-expansion-closeout` | Static Sprints 32–35 nested expansion evidence closeout |
| `pnpm validate:project:final-closeout` | Static Project 2 CLOSED + Project 3 handoff closeout |
| `pnpm validate:project03:charter-skeleton` | Static Project 3 charter docs closeout |
| `pnpm validate:project03:closeout` | Static Project 3 CLOSED (Partial) evidence (Sprint 44) |
| `pnpm validate:workflow:contract` | Multi-Agent Role Contract types / FakeWorkflowAgent |
| `pnpm validate:workflow:registry` | InMemoryWorkflowAgentRegistry invariants |
| `pnpm validate:workflow:orchestrator` | DefaultWorkflowOrchestrator + Fake invoker |
| `pnpm validate:workflow:handoff` | WorkflowHandoff builder + orchestrator wiring |
| `pnpm validate:workflow:memory` | InMemoryWorkflowMemoryStore + orchestrator append |
| `pnpm validate:workflow:evaluation` | DefaultWorkflowRunEvaluator pure scoring |
| `pnpm validate:application:eval-workflow` | RunWorkflowEvaluationUseCase Fake path |
| `pnpm validate:skeleton` | Directory, barrel, docs, and script integrity |
| `pnpm typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `pnpm validate:deployment:readiness` | Static Docker/docs/export readiness (no daemon) |
| `pnpm infra:config` | `docker compose ... config` (requires Docker daemon) |

## Dependencies

Minimized for the platform baseline:

- `typescript`, `tsx`, `@types/node` (dev only)
- No runtime framework, database, search, or AI SDK

## Next

**Project 2 is CLOSED.** **Project 3 — Enterprise AI Workflow — Multi-Agent**
is **CLOSED (Partial)** (five charter capabilities Partial; none Completed).
Handoff is to **Project 4 — Enterprise LLMOps Platform**. By-design non-goals
(LLM-as-judge, HTTP multi-agent API, official SDKs, Express/Fastify, full OIDC
login, full W3C propagator / `prom-client`) remain deferred. See
[`docs/portfolio.md`](docs/portfolio.md),
[`docs/agent/PROJECT03_INSTRUCTIONS.md`](docs/agent/PROJECT03_INSTRUCTIONS.md),
and [`docs/development.md`](docs/development.md).
