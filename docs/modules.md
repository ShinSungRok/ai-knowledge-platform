# Module Reference

## 1. Purpose

This document summarizes every major module under `app/knowledge/*`: its
responsibility and how it fits into the wider system. Each module has its own
`index.ts` barrel export. See [`docs/architecture.md`](architecture.md) for
dependency direction.

Module barrels are always present. Task 2 added the storage port/adapter pair.
Tasks 3–9 add list/page/create/update/delete/search/export application use
cases for knowledge documents. Task 10 scopes all of the above to a required
`workspaceId` — the minimal logical tenancy boundary (no Workspace entity or
repository yet). Task 11 adds a parallel, workspace-scoped registry for
`KnowledgeSource` (create-only). Task 12 links the two: `KnowledgeDocument`
carries a required `sourceId`, and `CreateKnowledgeDocumentUseCase` verifies
the referenced source exists in the same workspace before saving.
Other modules remain skeleton boundaries until scoped.

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical types (`KnowledgeDocument`, `KnowledgeSource`), both workspace-scoped via `workspaceId`. Zero outward dependencies. |
| `application` | Use cases (list/page/create/update/delete/search/export for documents; create for sources), each scoped to a `workspaceId`, over domain types and ports. |
| `repository` | Persistence-agnostic ports (`KnowledgeDocumentRepository`, `KnowledgeSourceRepository`); document/source methods take `workspaceId`. |
| `persistence` | Concrete adapters (`DefaultInMemoryRepository`, `DefaultInMemoryKnowledgeSourceRepository`; DB adapters later). |
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
