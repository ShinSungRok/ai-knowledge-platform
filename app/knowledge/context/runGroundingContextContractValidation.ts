import { KNOWLEDGE_MODULE_CONTEXT } from "./index";
import type { ContextAssembler } from "./ContextAssembler";
import type { ContextAssemblyInput } from "./ContextAssemblyInput";
import type { GroundingContext, GroundingContextBlock } from "./GroundingContext";
import type { ContextAssembler as TopLevelContextAssembler } from "../index";
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
 * Minimal in-file test double proving `ContextAssembler` is implementable
 * from just the exported contract types — no concrete adapter exists yet
 * (that is a later task). Renders each block deterministically so this
 * validation can also assert type-compatibility of `GroundingContextBlock`
 * / `GroundingContext` field shapes at both compile time (via `tsc`) and
 * runtime (via the assertions below).
 */
class FakeContextAssembler implements ContextAssembler {
  async assemble(input: ContextAssemblyInput): Promise<GroundingContext> {
    const blocks: GroundingContextBlock[] = input.chunks.map((retrieved) => ({
      sourceId: "source-1",
      documentId: retrieved.chunk.documentId,
      chunkId: retrieved.chunk.id,
      score: retrieved.score,
      text: retrieved.chunk.text,
    }));
    const content = blocks.map((block) => block.text).join("\n\n");
    return {
      query: input.query,
      blocks,
      content: content.slice(0, input.maxCharacters),
      truncated: content.length > input.maxCharacters,
    };
  }
}

function assertModuleConstant(): void {
  console.log("[context] KNOWLEDGE_MODULE_CONTEXT constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_CONTEXT, "app/knowledge/context", "unexpected KNOWLEDGE_MODULE_CONTEXT value");
}

async function assertContextAssemblerPortContract(): Promise<void> {
  console.log("[context] port contract (ContextAssembler) is implementable and callable...");
  const assembler: ContextAssembler = new FakeContextAssembler();
  assertTruthy(typeof assembler.assemble === "function", "assemble must be defined");

  const retrieved: RetrievedChunk = { chunk: chunk(), score: 0.75 };
  const input: ContextAssemblyInput = {
    workspaceId: WORKSPACE_A,
    query: "a query",
    chunks: [retrieved],
    maxCharacters: 1000,
  };

  const result = await assembler.assemble(input);

  assertEqual(result.query, "a query", "expected GroundingContext.query to be carried through");
  assertEqual(result.blocks.length, 1, "expected exactly one grounding context block");
  assertEqual(result.blocks[0]?.documentId, "doc-1", "expected GroundingContextBlock.documentId to be preserved");
  assertEqual(result.blocks[0]?.chunkId, "chunk-1", "expected GroundingContextBlock.chunkId to be preserved");
  assertEqual(result.blocks[0]?.score, 0.75, "expected GroundingContextBlock.score to be preserved");
  assertEqual(result.blocks[0]?.text, "body", "expected GroundingContextBlock.text to be preserved");
  assertTruthy(result.content.includes("body"), "expected GroundingContext.content to include the block's text");
  assertEqual(typeof result.truncated, "boolean", "expected GroundingContext.truncated to be a boolean");
}

async function assertContextAssemblyInputAcceptsEmptyChunks(): Promise<void> {
  console.log("[context] ContextAssemblyInput/GroundingContext types accommodate an empty chunk list...");
  const assembler: ContextAssembler = new FakeContextAssembler();
  const input: ContextAssemblyInput = {
    workspaceId: WORKSPACE_A,
    query: "no matches",
    chunks: [],
    maxCharacters: 500,
  };

  const result = await assembler.assemble(input);

  assertEqual(result.blocks.length, 0, "expected an empty blocks array for an empty chunk list");
  assertEqual(result.content, "", "expected empty content for an empty chunk list");
  assertEqual(result.truncated, false, "expected truncated=false when nothing was excluded");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[context] top-level app/knowledge barrel re-exports the context contract types...");
  // A compile-time-only check: `TopLevelContextAssembler` is imported from
  // `../index` (the top-level barrel) and assigned to a local variable of
  // the module-level `ContextAssembler` type. If the top-level barrel ever
  // dropped or renamed this export, this line would fail `pnpm typecheck`
  // (there is no runtime artifact for `export type`, so the check is
  // necessarily compile-time; the assertion below just gives this
  // validation step a visible runtime pass/fail line).
  const isAssignableToModuleType: ContextAssembler | null = null as TopLevelContextAssembler | null;
  assertTruthy(isAssignableToModuleType === null, "expected the top-level and module-level ContextAssembler types to be assignable to one another");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertContextAssemblerPortContract();
  await assertContextAssemblyInputAcceptsEmptyChunks();
  assertTopLevelBarrelExportsContractTypes();
  console.log("GroundingContext contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
