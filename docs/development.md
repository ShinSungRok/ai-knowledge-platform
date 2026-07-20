# Development Guide

## 1. Local development

```bash
pnpm install
pnpm typecheck
pnpm validate:skeleton
```

No external services, API keys, or Docker are required for skeleton validation.

## 2. Validation workflow

This repository follows Project1's validation philosophy: correctness is proven
by **dependency-free runners** (plain `tsx` scripts) that assert invariants and
exit non-zero on failure.

Current validators:

```bash
pnpm validate:skeleton         # directory + barrel + docs integrity
pnpm validate:repository       # DefaultInMemoryRepository port contract
pnpm validate:repository:source # DefaultInMemoryKnowledgeSourceRepository port contract
pnpm validate:repository:chunk # DefaultInMemoryDocumentChunkRepository port contract (findById/findAll + workspace-global id conflict rejection)
pnpm validate:application      # List + Page + Create + Update + Delete + Search + Export + Source + Retrieve + RetrieveHybrid + RetrieveGroundingContext + BuildGroundedPrompt + GenerateGroundedText use cases
pnpm validate:pipeline:connector # FakeKnowledgeSourceConnector port contract
pnpm validate:pipeline:sync    # SyncKnowledgeSourcePipeline idempotent sync behavior
pnpm validate:pipeline:chunk-document # ChunkKnowledgeDocumentPipeline chunk-and-replace behavior
pnpm validate:pipeline:rechunk-source # RechunkKnowledgeSourcePipeline source-scoped rebuild behavior
pnpm validate:pipeline:embed-document # EmbedDocumentChunksPipeline embed-and-upsert behavior
pnpm validate:pipeline:reindex-source # ReindexKnowledgeSourceEmbeddingsPipeline source-scoped reindex behavior
pnpm validate:embedding:chunker # FixedSizeDocumentChunker deterministic chunking behavior
pnpm validate:embedding:provider # FakeEmbeddingProvider deterministic embedding behavior
pnpm validate:embedding:index  # InMemoryVectorIndex upsert/find/findNearest cosine-ranking behavior
pnpm validate:retrieval:vector # DefaultVectorRetriever embed-query/find-nearest/hydrate-chunk behavior
pnpm validate:search:keyword   # DefaultKeywordSearch tokenize/score/rank behavior over DocumentChunkRepository.findAll
pnpm validate:search:hybrid    # DefaultHybridSearch reciprocal-rank-fusion behavior over VectorRetriever + KeywordSearch
pnpm validate:search:rerank-contract # Reranker/RerankingInput contract export + type-compatibility
pnpm validate:search:reranker # DefaultReranker coverage/density/original-score ranking and shared tokenize extraction
pnpm validate:search:reranked # DefaultRerankedSearch HybridSearch -> Reranker delegation and order-preservation
pnpm validate:context:contract # ContextAssembler/ContextAssemblyInput/GroundingContext contract export + type-compatibility
pnpm validate:context:assembler # DefaultContextAssembler provenance hydration, whole-block budget, and truncation behavior
pnpm validate:prompt:contract # PromptBuilder/GroundedPrompt contract export + type-compatibility
pnpm validate:prompt:builder # DefaultPromptBuilder fixed-format, evidence-bound prompt rendering
pnpm validate:application:grounding-context # RetrieveGroundingContextUseCase RerankedSearch -> ContextAssembler delegation sequence
pnpm validate:application:prompt # BuildGroundedPromptUseCase RetrieveGroundingContextUseCase -> PromptBuilder delegation sequence
pnpm validate:application:generate-text # GenerateGroundedTextUseCase BuildGroundedPromptUseCase -> LanguageModelProvider delegation sequence
pnpm validate:ai:provider-contract # LanguageModelProvider/GeneratedText contract export + type-compatibility
pnpm validate:ai:fake-provider # FakeLanguageModelProvider dependency-free, deterministic prompt-echo behavior
pnpm validate:rag:answer-contract # GroundedAnswerAssembler/GroundedAnswer/GroundedAnswerAssemblyInput contract export + type-compatibility
pnpm validate:rag:answer-assembler # DefaultGroundedAnswerAssembler insufficient-evidence policy and evidence-preserving assembly
pnpm validate:application:grounded-answer # GenerateGroundedAnswerUseCase evidence-gated orchestration of retrieval, prompt, generation, and answer assembly
pnpm typecheck                 # TypeScript strict check
pnpm validate                  # skeleton + repository + repository:source + repository:chunk + application (incl. grounding-context + prompt + generate-text + grounded-answer) + pipeline:connector + pipeline:sync + pipeline:chunk-document + pipeline:rechunk-source + pipeline:embed-document + pipeline:reindex-source + embedding:chunker + embedding:provider + embedding:index + retrieval:vector + search:keyword + search:hybrid + search:rerank-contract + search:reranker + search:reranked + context:contract + context:assembler + prompt:contract + prompt:builder + ai:provider-contract + ai:fake-provider + rag:answer-contract + rag:answer-assembler + typecheck
```

Formal unit/integration/e2e suites under `tests/` are reserved for later
phases. Prefer validation runners for architectural and contract checks.

## 3. Commit strategy

- One focused commit per task.
- Conventional Commits (`feat(scope):`, `chore(scope):`, `docs(scope):`).
- Never mark a task done before its required `pnpm validate*` / `pnpm typecheck`
  commands pass.

## 4. Phase strategy

Each phase:

1. Has one explicit **goal** and an explicit **non-goal** list.
2. Adds modules/files following interface + implementation patterns
   (`docs/architecture.md`).
3. Ships its own validation runner(s), using only fakes/in-memory adapters.
4. Is documented under `docs/` as part of the same commit that closes it.
5. Does not wire new capability into production runtime until an explicitly
   scoped later phase.

## 5. Coding principles

- **Interfaces before implementations.**
- **Composition root owns wiring.**
- **No external libraries for problems this repo already owns** (retry,
  timeout, circuit breaker, rate limiting, logging/metrics — when introduced).
- **Deterministic by default** — injectable clocks/delays for time-based logic.
- **Document limits, not just capabilities.**
