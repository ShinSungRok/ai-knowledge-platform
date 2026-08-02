# P4 — LLMOps / Control Plane

**Why:** AI를 제품으로 운영하려면 실행만으로는 부족하고, **버전·평가·배포설정·관측** 체계가 필요해서.

**What:** Backend **Control Plane** over P2/P3-style execution — Experiment Run Tracking, Prompt/Model Registry, Evaluation Gates / Regression Harness, Serving Configuration, LLMOps Observability.

**How (run locally):**

```bash
pnpm demo:llmops:control-plane

# Thin HTTP on same host as P2/P3 (Later)
pnpm start

# B-path: measure live cited-answers latency → inject into control-plane
# (host must already be running)
pnpm demo:llmops:from-cited-answer
```

InMemory 한 줄기로 Registry → Run → Gate → Regression → Serving → Observation을 출력합니다 (Docker/키 불필요).

### Call via `pnpm start` (Later — Thin Control Plane HTTP)

Same `NodeHttpListener` host as cited-answers / workflow-runs (no Express).
Bearer + workspace AuthZ. Body may be `{}` (default metrics).

When `LLM_MODEL` is set on the host, registry labels use that model id
(soft-link only — still InMemory control plane).

```bash
pnpm start
# logs include LLMOPS: inmemory-control-plane

curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/llmops/control-plane \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{}'
```

Expect HTTP 200 with `gatePassed: true`, `regressionPassed: true`,
`runStatus: "completed"`, `servingStatus: "active"`, `environment: "dev"`,
`gateDefinitionId`, and `observationId`. Without Bearer → 401.
Smoke: `pnpm validate:server:start-smoke` (includes llmops/control-plane).

Optional request-driven fields (all additive, default to the values above
when omitted):

```bash
curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/llmops/control-plane \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{
    "environment": "staging",
    "trafficPercent": 50,
    "gateRules": [{"metricKey": "citationCount", "comparator": "eq", "threshold": 1}]
  }'
```

`environment`/`trafficPercent` reach `staging`/`production` and partial
rollouts live, not just in validators. `gateRules` registers a fresh
`EvaluationGateDefinition` and evaluates against it instead of the shared
per-workspace default — reaching the `"eq"`/`"lte"` comparators live too.
Metrics that fail the gate or regression check now persist a real
`ExperimentRunRecord.status: "failed"` with an `error` message, instead of
always `"completed"`.

The stores backing every capability now persist for the life of the host
process (previously each POST built a fresh, throwaway InMemory story) —
so registered prompts/models/runs/serving configs/observations actually
accumulate, and each is inspectable read-only over HTTP:

```bash
# Runs
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/llmops/experiment-runs/<experimentRunId> \
  -H 'Authorization: Bearer demo-key'

# Prompt / Model registries
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/llmops/prompts -H 'Authorization: Bearer demo-key'
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/llmops/models -H 'Authorization: Bearer demo-key'

# Evaluation gate definitions (the shared default is registered once, reused thereafter)
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/llmops/evaluation-gates -H 'Authorization: Bearer demo-key'

# Serving configurations
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/llmops/serving-configs -H 'Authorization: Bearer demo-key'

# Observations
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/llmops/observations -H 'Authorization: Bearer demo-key'
```

Expect HTTP 200 for all six (404 for an unknown experiment run id, 401
without Bearer, 403 for the wrong workspace) — same pattern as the P3
Shared Workflow Memory / Role Contract HTTP routes.

### Live metrics from cited-answers (B-path)

With the host running (and ideally `LLM_API_KEY` / `LLM_MODEL` set):

```bash
export LLM_MODEL=gemini-3.6-flash   # optional; copied into servingLabels
pnpm demo:llmops:from-cited-answer
```

The helper:
1. `POST .../cited-answers` and records **wall-clock `latencyMs`**
2. Soft quality proxies from `insufficientEvidence` (not a full eval suite)
3. `POST .../llmops/control-plane` with those `metrics` (+ `servingLabels` when `LLM_MODEL` is set)

Manual equivalent:

```bash
# after measuring latencyMs yourself:
curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/llmops/control-plane \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"metrics":{"latencyMs":640,"hitRateAtK":0.92,"meanReciprocalRank":0.81,"citationCount":1},"servingLabels":{"modelName":"gemini-3.6-flash","providerModel":"gemini-3.6-flash"}}'
```

포트폴리오 스토리: [`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

---

## Control plane 파이프라인

```text
Prompt/Model Registry (persistent — accumulates across requests)
  → Experiment Run (params soft-link version ids + metrics; status now
    reflects real gate/regression outcome: completed | failed)
  → Evaluation Gate (numeric rules from a persisted, reusable
    EvaluationGateDefinition; request-driven override reaches eq/lte live;
    no LLM-as-judge)
  → Regression Harness (baseline vs candidate)
  → Serving Configuration (soft-link ids; request-driven environment/
    trafficPercent; activate/retire)
  → Observation Store (quality / cost / latency soft-map names)
```

| Capability | Module surface | HTTP | Validator |
|---|---|---|---|
| Experiment / Run Tracking | `InMemoryExperimentRunStore` (persistent) | `GET .../llmops/experiment-runs/:id` | `validate:llmops:run-store` |
| Prompt & Model Registry | `InMemoryPromptRegistry` / `InMemoryModelRegistry` (persistent) | `GET .../llmops/prompts`, `GET .../llmops/models` | `validate:llmops:prompt-registry` / `model-registry` |
| Evaluation Gates | `DefaultEvaluationGateEvaluator` + `InMemoryEvaluationGateDefinitionStore` (persistent) | `GET .../llmops/evaluation-gates` | `validate:llmops:evaluation-gate`, `validate:llmops:gate-definition-store` |
| Regression Harness | `DefaultRegressionHarness` | — | `validate:llmops:regression-harness` |
| Serving Configuration | `InMemoryServingConfigStore` (persistent) | `GET .../llmops/serving-configs` | `validate:llmops:serving-config` |
| Observability | `InMemoryLlmopsObservationStore` (persistent) | `GET .../llmops/observations` | `validate:llmops:observation-store` |

P2/P3와의 관계: Control Plane은 Knowledge Serving / Workflow **위**에서 버전·게이트·서빙설정·관측을 관리한다. 채팅 UI나 벤더 SaaS 대시보드가 아니다.

---

## 검증 (증거)

```bash
pnpm demo:llmops:control-plane
pnpm validate:llmops:contract
pnpm validate:llmops:run-store
pnpm validate:llmops:prompt-registry
pnpm validate:llmops:model-registry
pnpm validate:llmops:evaluation-gate
pnpm validate:llmops:gate-definition-store
pnpm validate:llmops:regression-harness
pnpm validate:llmops:serving-config
pnpm validate:llmops:observation-store
pnpm validate:api:llmops-control-plane
pnpm validate:application:llmops-control-plane
```

모듈: `app/knowledge/llmops`.

---

## 면접 한 줄

> I added an LLMOps **control plane**: persistent version registries, experiment run tracking with a real completed/failed status, evaluation gates backed by a reusable, request-overridable gate definition, regression checks, request-driven serving configuration (environment/traffic), and quality/cost/latency observations — plus a read-only HTTP inspection route per capability — so the platform can be operated as a managed system with real accumulated history, not a single throwaway demo call.
