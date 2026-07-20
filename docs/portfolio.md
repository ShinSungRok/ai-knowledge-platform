# Portfolio / Project Intent

## 1. What this is

**AI Knowledge Platform** is a production-shaped TypeScript backend for
knowledge retrieval and grounded question answering. It inherits the Clean /
Hexagonal / DDD architecture philosophy proven in Project1 (`public-law-ai`),
generalized beyond a single legal domain.

Project 2 delivers a **completed platform baseline**: workspace-scoped
knowledge pipelines through cited RAG answers, MCP/tool/agent/memory/jobs,
evaluation, in-process runtime, and operations foundations — all proven by
dependency-free validation runners against fake/in-memory adapters.

## 2. Capabilities Project 2 proves (Charter order)

| Capability | What is proven |
|---|---|
| Workspace isolation | Every knowledge path is scoped by `workspaceId`; cross-workspace access is blocked |
| Knowledge Source / Connector / Sync+Reconcile | Source registry, connector port, sync + change-detect + reconcile pipelines |
| Chunk / Embedding / Vector | Deterministic chunking, fake embedding, in-memory vector index, embed/reindex pipelines |
| Hybrid + Rerank retrieval | Keyword, vector, RRF hybrid, deterministic rerank, grounding context assembly |
| Prompt / LLM / Grounding / Citation | Grounded prompts, fake LLM, insufficient-evidence policy, evidence-bound citations |
| MCP / Tool Calling / Agent / Memory | MCP tool registry, tool executor, planner→execute→review agent, session memory |
| Background Jobs | Job store/processor with sync and reindex handlers |
| Evaluation | Retrieval / grounding / citation evaluators and run use cases |
| Runtime | Runtime config, in-memory composition, framework-independent HTTP/API, server lifecycle (no TCP) |
| Operations | Logger/metrics, retry/timeout policies, workspace HTTP guard, observing router, deployment readiness |

## 3. Validation strategy

Correctness is proven by **dependency-free `tsx` validation runners** that
assert invariants and exit non-zero on failure. Concrete adapters used in
validation are **fake or in-memory only** — no Docker daemon, network, API
keys, or real servers are required for `pnpm validate`.

## 4. Intentional non-goals (Project 2)

Project 2 deliberately does **not** include:

- Real Postgres / OpenSearch adapters
- Real LLM SDK providers
- MCP network transport
- TCP socket listen (Express / `node:http`)
- AuthN / JWT / OIDC
- OpenTelemetry / Prometheus exporters

Those belong to later infrastructure and productization phases.

## 5. Relationship to Project1

| Concern | Project1 (`public-law-ai`) | This project |
|---|---|---|
| Domain | Korean legal statutes / cases | General knowledge documents |
| Architecture | Clean / Hexagonal / DDD | Same philosophy |
| Validation | `tsx` runners, fake adapters | Same approach |
| Goal | Portfolio RAG backend + UI | Broader knowledge + MCP + Agent platform baseline |
