import { KNOWLEDGE_MODULE_CITATION } from "./index";
import type { CitationBuilder } from "./CitationBuilder";
import type { Citation } from "./Citation";
import type { CitationBuilder as TopLevelCitationBuilder } from "../index";
import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { GroundingContextBlock } from "../context/GroundingContext";

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

/**
 * Minimal in-file test double proving `CitationBuilder` is
 * implementable from just the exported contract types — no concrete
 * adapter exists yet (that is a later task). Applies a trivial
 * one-citation-per-evidence mapping so this validation can also assert
 * type-compatibility of the `Citation[]` return shape at both compile
 * time (via `tsc`) and runtime (via the assertions below).
 */
class FakeCitationBuilder implements CitationBuilder {
  async build(answer: GroundedAnswer): Promise<Citation[]> {
    return answer.evidence.map((block) => ({
      id: `cite:${block.sourceId}:${block.documentId}:${block.chunkId}`,
      sourceId: block.sourceId,
      documentId: block.documentId,
      chunkId: block.chunkId,
      score: block.score,
      excerpt: block.text,
    }));
  }
}

function evidenceBlock(overrides: Partial<GroundingContextBlock> = {}): GroundingContextBlock {
  return {
    sourceId: "source-1",
    documentId: "doc-1",
    chunkId: "chunk-1",
    score: 0.9,
    text: "evidence text",
    ...overrides,
  };
}

function groundedAnswer(overrides: Partial<GroundedAnswer> = {}): GroundedAnswer {
  return {
    text: "an answer",
    evidence: [evidenceBlock()],
    insufficientEvidence: false,
    ...overrides,
  };
}

function assertModuleConstant(): void {
  console.log("[citation] KNOWLEDGE_MODULE_CITATION constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_CITATION,
    "app/knowledge/citation",
    "unexpected KNOWLEDGE_MODULE_CITATION value",
  );
}

async function assertCitationBuilderPortContract(): Promise<void> {
  console.log("[citation] port contract (CitationBuilder) is implementable and callable...");
  const builder: CitationBuilder = new FakeCitationBuilder();
  assertTruthy(typeof builder.build === "function", "build must be defined");

  const answer = groundedAnswer({
    evidence: [
      evidenceBlock({
        sourceId: "source-1",
        documentId: "doc-1",
        chunkId: "chunk-1",
        score: 0.9,
        text: "policy text",
      }),
    ],
  });

  const result = await builder.build(answer);

  assertTruthy(Array.isArray(result), "expected Citation[] to be an array");
  assertEqual(result.length, 1, "expected exactly one citation for one evidence block");
  assertEqual(typeof result[0]?.id, "string", "expected Citation.id to be a string");
  assertEqual(typeof result[0]?.sourceId, "string", "expected Citation.sourceId to be a string");
  assertEqual(typeof result[0]?.documentId, "string", "expected Citation.documentId to be a string");
  assertEqual(typeof result[0]?.chunkId, "string", "expected Citation.chunkId to be a string");
  assertEqual(typeof result[0]?.score, "number", "expected Citation.score to be a number");
  assertEqual(typeof result[0]?.excerpt, "string", "expected Citation.excerpt to be a string");
}

async function assertCitationBuilderAcceptsEmptyEvidenceAnswer(): Promise<void> {
  console.log("[citation] CitationBuilder accommodates an empty-evidence GroundedAnswer...");
  const builder: CitationBuilder = new FakeCitationBuilder();
  const answer = groundedAnswer({
    text: "The available knowledge does not contain enough information.",
    evidence: [],
    insufficientEvidence: true,
  });

  const result = await builder.build(answer);

  assertEqual(result.length, 0, "expected an empty Citation[] when the answer carried no evidence");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[citation] top-level app/knowledge barrel re-exports the CitationBuilder contract types...");
  // A compile-time-only check: `TopLevelCitationBuilder` is imported
  // from `../index` (the top-level barrel) and assigned to a local
  // variable of the module-level `CitationBuilder` type. If the
  // top-level barrel ever dropped or renamed this export, this line
  // would fail `pnpm typecheck` (there is no runtime artifact for
  // `export type`, so the check is necessarily compile-time; the
  // assertion below just gives this validation step a visible
  // runtime pass/fail line).
  const isAssignableToModuleType: CitationBuilder | null =
    null as TopLevelCitationBuilder | null;
  assertTruthy(
    isAssignableToModuleType === null,
    "expected the top-level and module-level CitationBuilder types to be assignable to one another",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertCitationBuilderPortContract();
  await assertCitationBuilderAcceptsEmptyEvidenceAnswer();
  assertTopLevelBarrelExportsContractTypes();
  console.log("CitationBuilder contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
