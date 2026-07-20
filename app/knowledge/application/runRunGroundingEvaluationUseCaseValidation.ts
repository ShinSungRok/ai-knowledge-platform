import { readFileSync } from "node:fs";
import path from "node:path";
import {
  RunGroundingEvaluationUseCase,
} from "./RunGroundingEvaluationUseCase";
import type { GenerateGroundedAnswerUseCase } from "./GenerateGroundedAnswerUseCase";
import type { EvaluationDataset } from "../evaluation/EvaluationDataset";
import type { GroundingEvaluator } from "../evaluation/GroundingEvaluator";
import type { GroundingEvaluationMetrics } from "../evaluation/GroundingEvaluationMetrics";
import type { GroundedAnswer } from "../rag/GroundedAnswer";

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

async function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected rejection containing: ${messageSubstring}`);
}

class FakeGenerateGroundedAnswer {
  public calls: string[] = [];
  async execute(input: { query: string }): Promise<GroundedAnswer> {
    this.calls.push(input.query);
    return { text: "t", evidence: [], insufficientEvidence: true };
  }
}

class RecordingEvaluator implements GroundingEvaluator {
  public called = false;
  evaluate(): GroundingEvaluationMetrics {
    this.called = true;
    return { caseCount: 1, complianceRate: 1, caseScores: [] };
  }
}

function assertDependsOnlyOnPorts(): void {
  console.log(
    "[application] RunGroundingEvaluationUseCase depends only on GenerateGroundedAnswerUseCase and GroundingEvaluator...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/application/RunGroundingEvaluationUseCase.ts",
    ),
    "utf8",
  );
  assertTruthy(
    source.includes("./GenerateGroundedAnswerUseCase"),
    "must import GenerateGroundedAnswerUseCase",
  );
  assertTruthy(
    source.includes("../evaluation/GroundingEvaluator"),
    "must import GroundingEvaluator",
  );
  const forbidden = [
    "DefaultGroundingEvaluator",
    "DefaultGroundedAnswerAssembler",
    "../persistence",
  ];
  for (const reference of forbidden) {
    assertTruthy(!source.includes(reference), `must not reference "${reference}"`);
  }
}

async function assertRunsOnlyTargetCases(): Promise<void> {
  console.log(
    "[application] execute runs only expectInsufficientEvidence cases...",
  );
  const generate = new FakeGenerateGroundedAnswer();
  const evaluator = new RecordingEvaluator();
  const useCase = new RunGroundingEvaluationUseCase(
    generate as unknown as GenerateGroundedAnswerUseCase,
    evaluator,
  );
  const dataset: EvaluationDataset = {
    id: "ds",
    cases: [
      {
        id: "a",
        workspaceId: "ws",
        query: "target",
        expectedChunkIds: [],
        expectInsufficientEvidence: true,
      },
      {
        id: "b",
        workspaceId: "ws",
        query: "skip",
        expectedChunkIds: ["x"],
      },
    ],
  };
  await useCase.execute({
    dataset,
    retrievalLimit: 3,
    maxCharacters: 100,
  });
  assertEqual(generate.calls.length, 1, "one generate call");
  assertEqual(generate.calls[0], "target", "target query");
  assertTruthy(evaluator.called, "evaluator called");
}

async function assertRejectsWithoutTargetCases(): Promise<void> {
  console.log(
    "[application] execute rejects when no expectInsufficientEvidence cases...",
  );
  const generate = new FakeGenerateGroundedAnswer();
  const evaluator = new RecordingEvaluator();
  const useCase = new RunGroundingEvaluationUseCase(
    generate as unknown as GenerateGroundedAnswerUseCase,
    evaluator,
  );
  await assertRejects(
    useCase.execute({
      dataset: {
        id: "ds",
        cases: [
          {
            id: "a",
            workspaceId: "ws",
            query: "q",
            expectedChunkIds: [],
          },
        ],
      },
      retrievalLimit: 1,
      maxCharacters: 10,
    }),
    "No grounding evaluation cases with expectInsufficientEvidence=true",
  );
  assertEqual(generate.calls.length, 0, "no generate");
  assertEqual(evaluator.called, false, "no evaluate");
}

async function main(): Promise<void> {
  assertDependsOnlyOnPorts();
  await assertRunsOnlyTargetCases();
  await assertRejectsWithoutTargetCases();
  console.log("RunGroundingEvaluationUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
