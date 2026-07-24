# P4 — LLMOps / Control Plane

**Why:** AI를 제품으로 운영하려면 실행만으로는 부족하고, **버전·평가·배포설정·관측** 체계가 필요해서.

**What:** Backend **Control Plane** over P2/P3-style execution — Experiment Run Tracking, Prompt/Model Registry, Evaluation Gates / Regression Harness, Serving Configuration, LLMOps Observability.

**How (run locally):**

```bash
pnpm demo:llmops:control-plane

# Thin HTTP on same host as P2/P3 (Later)
pnpm start
```

InMemory 한 줄기로 Registry → Run → Gate → Regression → Serving → Observation을 출력합니다 (Docker/키 불필요).

### Call via `pnpm start` (Later — Thin Control Plane HTTP)

Same `NodeHttpListener` host as cited-answers / workflow-runs (no Express).
Bearer + workspace AuthZ. Body may be `{}` (default metrics).

```bash
pnpm start
# logs include LLMOPS: inmemory-control-plane

curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/llmops/control-plane \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{}'
```

Expect HTTP 200 with `gatePassed: true`, `regressionPassed: true`,
`servingStatus: "active"`, and `observationId`. Without Bearer → 401.
Smoke: `pnpm validate:server:start-smoke` (includes llmops/control-plane).

포트폴리오 스토리: [`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

---

## Control plane 파이프라인

```text
Prompt/Model Registry
  → Experiment Run (params soft-link version ids + metrics)
  → Evaluation Gate (numeric rules; no LLM-as-judge)
  → Regression Harness (baseline vs candidate)
  → Serving Configuration (soft-link ids; activate/retire)
  → Observation Store (quality / cost / latency soft-map names)
```

| Capability | Module surface | Validator |
|---|---|---|
| Experiment / Run Tracking | `InMemoryExperimentRunStore` | `validate:llmops:run-store` |
| Prompt & Model Registry | `InMemoryPromptRegistry` / `InMemoryModelRegistry` | `validate:llmops:prompt-registry` / `model-registry` |
| Evaluation Gates | `DefaultEvaluationGateEvaluator` | `validate:llmops:evaluation-gate` |
| Regression Harness | `DefaultRegressionHarness` | `validate:llmops:regression-harness` |
| Serving Configuration | `InMemoryServingConfigStore` | `validate:llmops:serving-config` |
| Observability | `InMemoryLlmopsObservationStore` | `validate:llmops:observation-store` |

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
pnpm validate:llmops:regression-harness
pnpm validate:llmops:serving-config
pnpm validate:llmops:observation-store
```

모듈: `app/knowledge/llmops`.

---

## 면접 한 줄

> I added an LLMOps **control plane**: version registries, experiment run tracking, evaluation gates and regression checks, serving configuration, and quality/cost/latency observations—so the platform can be operated as a managed system, not only a demo call.
