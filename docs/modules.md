# Module Reference

## 1. Purpose

This document summarizes every major module under `app/knowledge/*`: its
responsibility and how it fits into the wider system. Each module has its own
`index.ts` barrel export. See [`docs/architecture.md`](architecture.md) for
dependency direction.

Module barrels are always present. Task 2 added the storage port/adapter pair.
Tasks 3–6 add list/create/update/delete application use cases for knowledge documents.
Other modules remain skeleton boundaries until scoped.

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical types (`KnowledgeDocument`). Zero outward dependencies. |
| `application` | Use cases (list/create/update/delete) over domain types and ports. |
| `repository` | Persistence-agnostic ports (`KnowledgeDocumentRepository` including `deleteById`). |
| `persistence` | Concrete adapters (`DefaultInMemoryRepository`; DB adapters later). |
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
