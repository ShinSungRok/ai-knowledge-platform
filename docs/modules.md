# Module Reference

## 1. Purpose

This document summarizes every major module under `app/knowledge/*`: its
responsibility and how it fits into the wider system. Each module has its own
`index.ts` barrel export. See [`docs/architecture.md`](architecture.md) for
dependency direction.

All modules below are **skeleton boundaries** in Task 1 — markers are
exported so the graph is importable and validatable. Features land in later
phases.

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical, framework-independent knowledge types. Zero outward dependencies. |
| `application` | Use-case orchestration over domain types and ports. |
| `repository` | Persistence-agnostic document access ports. |
| `persistence` | Concrete repository adapters (JSON, PostgreSQL, etc.). |
| `pipeline` | Ingestion pipelines from external knowledge sources. |
| `embedding` | Chunking, embedding, and vector indexing ports/adapters. |
| `search` | Search engine abstraction (keyword, vector, hybrid). |
| `retrieval` | Retriever port consumed by the RAG flow. |
| `context` | Prompt context assembly from retrieved documents. |
| `prompt` | Prompt construction from context. |
| `citation` | Citation building from retrieved sources. |
| `rag` | RAG answer assembly (answer + citations). |
| `ai` | AI provider abstraction (fake + real providers). |
| `api` | Controllers and request/response DTOs. |
| `http` | Framework-independent HTTP abstraction. |
| `server` | Production server runtime and lifecycle. |
| `composition` | Composition root — wires concrete adapters. |
| `config` | Typed, validated, environment-driven configuration. |

## 3. Cross-cutting modules

| Module | Responsibility |
|---|---|
| `evaluation` | Quality, regression, and benchmark evaluation framework. |
| `observability` | Logging, metrics, and health-check foundations. |
| `reliability` | Retry, timeout, circuit breaker, error classification. |
| `security` | Rate limiting and input validation foundations. |
| `infra` | Local Docker infrastructure validation helpers. |

## 4. Top-level shape

```
app/knowledge/
  domain/
  repository/ persistence/ pipeline/
  embedding/ search/ retrieval/
  context/ prompt/ citation/ rag/
  ai/ application/
  api/ http/ server/
  composition/ config/
  evaluation/ observability/ reliability/ security/
  infra/
```
