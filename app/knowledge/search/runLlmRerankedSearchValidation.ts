import { readFileSync } from "node:fs";
import path from "node:path";

import { LlmRerankedSearch } from "./LlmRerankedSearch";
import type { RerankedSearch } from "./RerankedSearch";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GeneratedText } from "../ai/GeneratedText";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { DocumentChunk } from "../domain/DocumentChunk";

const WORKSPACE_A = "workspace-a";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function chunk(overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: "doc-1",
    text: "body",
    order: 0,
    ...overrides,
  };
}

class FixedRerankedSearch implements RerankedSearch {
  constructor(private readonly result: RetrievalResult) {}
  async search(): Promise<RetrievalResult> {
    return this.result;
  }
}

/** Validation-only Fake LanguageModelProvider: returns a scripted response string, records the last prompt it received. */
class ScriptedLanguageModelProvider implements LanguageModelProvider {
  public lastPrompt: GroundedPrompt | null = null;
  public callCount = 0;

  constructor(private readonly response: string) {}

  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    this.callCount += 1;
    this.lastPrompt = prompt;
    return { text: this.response };
  }
}

/** Echoes the prompt back verbatim, matching FakeLanguageModelProvider's real behavior. */
class EchoingLanguageModelProvider implements LanguageModelProvider {
  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    return { text: prompt.userMessage };
  }
}

async function assertPortContract(): Promise<void> {
  console.log("[search] port contract (RerankedSearch)...");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({ query: "q", chunks: [] }),
    new EchoingLanguageModelProvider(),
  );
  assertTruthy(typeof search.search === "function", "search must be defined");
}

async function assertReturnsEmptyWithoutCallingLlmWhenNoChunks(): Promise<void> {
  console.log("[search] search skips the LLM call entirely when there are no candidates...");
  const llm = new ScriptedLanguageModelProvider("1: 10");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({ query: "q", chunks: [] }),
    llm,
  );
  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });
  assertEqual(result.chunks.length, 0, "expected an empty result");
  assertEqual(llm.callCount, 0, "expected the LLM to never be called for an empty candidate set");
}

async function assertReordersByParsedLlmScores(): Promise<void> {
  console.log("[search] search re-orders candidates by the LLM's parsed per-candidate scores...");
  const llm = new ScriptedLanguageModelProvider("1: 2\n2: 9\n3: 5");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({
      query: "q",
      chunks: [
        { chunk: chunk({ id: "chunk-first-in" }), score: 0.9 },
        { chunk: chunk({ id: "chunk-second-in" }), score: 0.5 },
        { chunk: chunk({ id: "chunk-third-in" }), score: 0.1 },
      ],
    }),
    llm,
  );

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(result.chunks.length, 3, "expected all three candidates back");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-second-in", "expected the LLM's highest-scored candidate (9/10) to rank first despite the lowest incoming score");
  assertEqual(result.chunks[0]?.score, 0.9, "expected the LLM score normalized to 0..1 (9/10)");
  assertEqual(result.chunks[1]?.chunk.id, "chunk-third-in", "expected the LLM's middle-scored candidate (5/10) second");
  assertEqual(result.chunks[2]?.chunk.id, "chunk-first-in", "expected the LLM's lowest-scored candidate (2/10) last, despite the highest incoming score");
}

async function assertKeepsIncomingScoreWhenLlmOmitsACandidate(): Promise<void> {
  console.log("[search] search keeps a candidate's incoming score when the LLM response omits its line...");
  const llm = new ScriptedLanguageModelProvider("1: 8");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({
      query: "q",
      chunks: [
        { chunk: chunk({ id: "chunk-a" }), score: 0.42 },
        { chunk: chunk({ id: "chunk-b" }), score: 0.17 },
      ],
    }),
    llm,
  );

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });
  const chunkB = result.chunks.find((c) => c.chunk.id === "chunk-b");
  assertEqual(chunkB?.score, 0.17, "expected chunk-b's original score to survive unchanged since the LLM never scored it");
}

async function assertNoOpWhenNothingParses(): Promise<void> {
  console.log("[search] search is a no-op (keeps every incoming score) when the LLM response has no parseable score lines, e.g. an echoing Fake provider...");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({
      query: "distinctive query text",
      chunks: [
        { chunk: chunk({ id: "chunk-a", text: "alpha" }), score: 0.6 },
        { chunk: chunk({ id: "chunk-b", text: "beta" }), score: 0.3 },
      ],
    }),
    new EchoingLanguageModelProvider(),
  );

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "distinctive query text", limit: 10 });
  assertEqual(result.chunks.find((c) => c.chunk.id === "chunk-a")?.score, 0.6, "expected chunk-a's score unchanged");
  assertEqual(result.chunks.find((c) => c.chunk.id === "chunk-b")?.score, 0.3, "expected chunk-b's score unchanged");
}

async function assertPromptIncludesQueryAndNumberedPassages(): Promise<void> {
  console.log("[search] search builds a prompt containing the query and every candidate as a numbered passage...");
  const llm = new ScriptedLanguageModelProvider("1: 5\n2: 5");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({
      query: "what is the policy?",
      chunks: [
        { chunk: chunk({ id: "chunk-a", text: "policy text A" }), score: 0.5 },
        { chunk: chunk({ id: "chunk-b", text: "policy text B" }), score: 0.4 },
      ],
    }),
    llm,
  );

  await search.search({ workspaceId: WORKSPACE_A, query: "what is the policy?", limit: 10 });

  assertEqual(llm.callCount, 1, "expected exactly one LLM call regardless of candidate count");
  assertTruthy(
    llm.lastPrompt?.userMessage.includes("what is the policy?"),
    "expected the prompt to include the query text",
  );
  assertTruthy(
    llm.lastPrompt?.userMessage.includes("1) policy text A"),
    "expected the prompt to include the first candidate, numbered",
  );
  assertTruthy(
    llm.lastPrompt?.userMessage.includes("2) policy text B"),
    "expected the prompt to include the second candidate, numbered",
  );
  assertTruthy(
    (llm.lastPrompt?.systemInstruction.length ?? 0) > 0,
    "expected a non-empty system instruction",
  );
}

async function assertBreaksExactScoreTiesByChunkIdAscending(): Promise<void> {
  console.log("[search] search breaks an exact LLM-score tie by chunk id ascending...");
  const llm = new ScriptedLanguageModelProvider("1: 7\n2: 7");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({
      query: "q",
      chunks: [
        { chunk: chunk({ id: "chunk-z" }), score: 0 },
        { chunk: chunk({ id: "chunk-a" }), score: 0 },
      ],
    }),
    llm,
  );

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });
  assertEqual(result.chunks[0]?.score, result.chunks[1]?.score, "expected an exact tie");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-a", "expected the lexicographically smaller id to rank first on a tie");
}

async function assertClampsOutOfRangeLlmScores(): Promise<void> {
  console.log("[search] search clamps an out-of-range LLM score into 0..10 before normalizing...");
  const llm = new ScriptedLanguageModelProvider("1: 55\n2: -3");
  const search = new LlmRerankedSearch(
    new FixedRerankedSearch({
      query: "q",
      chunks: [
        { chunk: chunk({ id: "chunk-a" }), score: 0.5 },
        { chunk: chunk({ id: "chunk-b" }), score: 0.5 },
      ],
    }),
    llm,
  );

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });
  assertEqual(result.chunks.find((c) => c.chunk.id === "chunk-a")?.score, 1, "expected an over-range score to clamp to 10/10=1");
  assertEqual(result.chunks.find((c) => c.chunk.id === "chunk-b")?.score, 0, "expected a negative score to clamp to 0");
}

function assertLlmRerankedSearchImportsOnlyPorts(): void {
  console.log("[search] LlmRerankedSearch imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/LlmRerankedSearch.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "./RerankedSearch"'),
    "LlmRerankedSearch.ts must import the RerankedSearch port",
  );
  assertTruthy(
    source.includes('from "../ai/LanguageModelProvider"'),
    "LlmRerankedSearch.ts must import the LanguageModelProvider port",
  );
  const forbiddenReferences = [
    "FakeLanguageModelProvider",
    "HttpLanguageModelProvider",
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "NormalizedReranker",
    "../persistence",
    "../embedding",
    "../repository",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `LlmRerankedSearch.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertReturnsEmptyWithoutCallingLlmWhenNoChunks();
  await assertReordersByParsedLlmScores();
  await assertKeepsIncomingScoreWhenLlmOmitsACandidate();
  await assertNoOpWhenNothingParses();
  await assertPromptIncludesQueryAndNumberedPassages();
  await assertBreaksExactScoreTiesByChunkIdAscending();
  await assertClampsOutOfRangeLlmScores();
  assertLlmRerankedSearchImportsOnlyPorts();
  console.log("LlmRerankedSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
