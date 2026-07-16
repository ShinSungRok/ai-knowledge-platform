# tests/

Test layout reserved for future phases.

| Directory | Intent |
|---|---|
| `unit/` | Isolated unit tests for pure domain/application logic |
| `integration/` | Cross-module tests against fakes/in-memory adapters |
| `e2e/` | End-to-end flows (HTTP + composition), still without external services by default |

## Current approach

Architectural and contract checks run via **validation runners** under
`scripts/` and `app/knowledge/**/run*Validation.ts`, following Project1.
Prefer those for dependency-free, CI-friendly assertions until a formal test
runner is introduced deliberately.

| Area | Location |
|---|---|
| Case inventory | `tests/unit/defaultInMemoryRepository.cases.ts` |
| Case inventory | `tests/unit/listKnowledgeDocumentsUseCase.cases.ts` |
| Case inventory | `tests/unit/listKnowledgeDocumentsPageUseCase.cases.ts` |
| Case inventory | `tests/unit/createKnowledgeDocumentUseCase.cases.ts` |
| Case inventory | `tests/unit/updateKnowledgeDocumentUseCase.cases.ts` |
| Case inventory | `tests/unit/deleteKnowledgeDocumentUseCase.cases.ts` |
| Case inventory | `tests/unit/searchKnowledgeDocumentsUseCase.cases.ts` |
| Executable checks | `pnpm validate:repository`, `pnpm validate:application` |
