import { KNOWLEDGE_MODULE_SEARCH } from "./index";
import type { Reranker } from "./Reranker";
import type { RerankingInput } from "./RerankingInput";
import type { Reranker as TopLevelReranker } from "../index";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { RetrievedChunk } from "../retrieval/RetrievalResult";

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

/**
 * Minimal in-file test double proving `Reranker` is implementable from
 * just the exported contract types — no concrete adapter exists yet
 * (that is a later task). Reverses input order deterministically so this
 * validation can also assert type-compatibility of the `RetrievedChunk[]`
 * return shape at both compile time (via `tsc`) and runtime (via the
 * assertions below).
 */
class FakeReranker implements Reranker {
  async rerank(input: RerankingInput): Promise<RetrievedChunk[]> {
    return [...input.chunks].reverse();
  }
}

function assertModuleConstant(): void {
  console.log("[search] KNOWLEDGE_MODULE_SEARCH constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_SEARCH, "app/knowledge/search", "unexpected KNOWLEDGE_MODULE_SEARCH value");
}

async function assertRerankerPortContract(): Promise<void> {
  console.log("[search] port contract (Reranker) is implementable and callable...");
  const reranker: Reranker = new FakeReranker();
  assertTruthy(typeof reranker.rerank === "function", "rerank must be defined");

  const first: RetrievedChunk = { chunk: chunk({ id: "chunk-1" }), score: 0.1 };
  const second: RetrievedChunk = { chunk: chunk({ id: "chunk-2" }), score: 0.9 };
  const input: RerankingInput = {
    workspaceId: WORKSPACE_A,
    query: "a query",
    chunks: [first, second],
  };

  const result = await reranker.rerank(input);

  assertEqual(result.length, 2, "expected rerank to return every candidate chunk");
  assertEqual(result[0]?.chunk.id, "chunk-2", "expected rerank's return array shape to be usable as RetrievedChunk[]");
  assertEqual(result[1]?.chunk.id, "chunk-1", "expected rerank's return array shape to be usable as RetrievedChunk[]");
}

async function assertRerankingInputAcceptsEmptyChunks(): Promise<void> {
  console.log("[search] RerankingInput/Reranker types accommodate an empty chunk list...");
  const reranker: Reranker = new FakeReranker();
  const input: RerankingInput = {
    workspaceId: WORKSPACE_A,
    query: "no candidates",
    chunks: [],
  };

  const result = await reranker.rerank(input);

  assertEqual(result.length, 0, "expected an empty result for an empty chunk list");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[search] top-level app/knowledge barrel re-exports the Reranker contract types...");
  // A compile-time-only check: `TopLevelReranker` is imported from
  // `../index` (the top-level barrel) and assigned to a local variable of
  // the module-level `Reranker` type. If the top-level barrel ever
  // dropped or renamed this export, this line would fail `pnpm
  // typecheck` (there is no runtime artifact for `export type`, so the
  // check is necessarily compile-time; the assertion below just gives
  // this validation step a visible runtime pass/fail line).
  const isAssignableToModuleType: Reranker | null = null as TopLevelReranker | null;
  assertTruthy(isAssignableToModuleType === null, "expected the top-level and module-level Reranker types to be assignable to one another");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertRerankerPortContract();
  await assertRerankingInputAcceptsEmptyChunks();
  assertTopLevelBarrelExportsContractTypes();
  console.log("Reranker contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
