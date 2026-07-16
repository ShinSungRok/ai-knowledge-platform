# Architecture

## 1. Purpose

This document describes the architectural style this codebase follows, how
`app/knowledge/*` modules relate to one another, and which direction
dependencies are allowed to point. It is the map to read alongside
[`docs/modules.md`](modules.md).

Task 1 ships **module boundaries only** — no feature implementation. The
philosophy below is inherited from Project1 (`public-law-ai`) and is the
contract future phases must honor.

## 2. Clean Architecture

Every module is split into **interfaces** (the "port") and **implementations**
(the "adapter"). Business logic (use cases, prompt building, citation
extraction, RAG answer assembly) depends only on the interface, never on a
concrete adapter. This makes it possible to run the entire application against
fakes/in-memory adapters in validation, and against real infrastructure in
production, with **zero changes to the business logic itself**.

Concrete adapters are selected and wired together in exactly one place: the
**composition root** (`app/knowledge/composition`). No use case, controller, or
domain type ever imports a concrete adapter directly.

## 3. Hexagonal Architecture

The same interface/implementation split is organized around the application
core as ports and adapters:

- **Inbound ports/adapters** — `http` adapts an inbound HTTP request into a
  call against `api` controllers, which in turn call application services.
- **Outbound ports/adapters** — retrieval, search, repository, and AI provider
  ports; their concrete adapters are plugged in by the composition root.

Nothing in `application`, `rag`, `context`, or `prompt` knows whether it is
being driven by a real HTTP request, a validation runner, or the production
server entrypoint — that is the point of the hexagon.

## 4. Domain-Driven Design (DDD)

`app/knowledge/domain` holds the framework-independent, canonical model of the
problem. It has no dependency on frameworks, databases, search engines, or AI
SDKs. Application-level orchestration lives in `app/knowledge/application` as
explicit **use cases** — each open about the single job it does, composed from
domain types and ports.

## 5. Module relationships (target)

```
domain  ←──────────────┐  (no outward dependencies)
  ↑                     │
repository              │
  ↑                     │
persistence             │
  ↑                     │
retrieval ←── search ←── embedding
  ↑
context ←── prompt
  ↑
rag ←── citation
  ↑
application ←── ai
  ↑
api ←── http
  ↑
composition  (wires every interface above to a concrete implementation)
  ↑
server  (production entrypoint; boots composition + lifecycle)

config             → read by composition only
evaluation         → depends downward; no production code depends on it
observability      → framework-independent cross-cutting foundation
reliability, security → framework-independent cross-cutting foundations
pipeline, infra    → operational edges; not imported by domain/application
```

Arrows point from a lower-level module toward the higher-level module that
depends on it. `domain` sits at the bottom with no outward dependencies.

## 6. Dependency direction

- **Domain has zero outward dependencies.**
- **Interfaces before implementations.**
- **Composition is the only place allowed to know about every concrete adapter.**
- **Cross-cutting modules stay decoupled from business logic.**
- **No upward imports.** The dependency graph stays acyclic.

## 7. Current limitations

- Domain storage port + in-memory adapter exist (`KnowledgeDocumentRepository` /
  `DefaultInMemoryRepository`).
- CRUD + search use cases exist (`ListKnowledgeDocumentsUseCase`,
  `CreateKnowledgeDocumentUseCase`, `UpdateKnowledgeDocumentUseCase`,
  `DeleteKnowledgeDocumentUseCase`, `SearchKnowledgeDocumentsUseCase`).
  Search covers `title`/`text` only (no tags on the domain model yet).
- `ListKnowledgeDocumentsPageUseCase` adds sorting + paging. Sorting is limited
  to `id`/`title` — `KnowledgeDocument` has no creation-date field yet, so
  sort-by-creation-date is deferred until the domain model adds one.
- Database adapters, HTTP/server, search, and AI provider wiring are not
  implemented yet.
- Validate with `pnpm validate` (skeleton + repository + application + typecheck).
