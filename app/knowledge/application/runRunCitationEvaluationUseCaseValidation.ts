import { readFileSync } from "node:fs";
import path from "node:path";
import {
  RunCitationEvaluationUseCase,
} from "./RunCitationEvaluationUseCase";
import type { GenerateCitedGroundedAnswerUseCase } from "./GenerateCitedGroundedAnswerUseCase";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { EvaluationDataset } from "../evaluation/EvaluationDataset";
import type { CitationEvaluator } from "../evaluation/CitationEvaluator";
import type { CitationEvaluationMetrics } from "../evaluation/CitationEvaluationMetrics";

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

class FakeGenerateCited {
  public calls = 0;
  async execute(): Promise<CitedGroundedAnswer> {
    this.calls += 1;
    return {
      answer: { text: "t", evidence: [], insufficientEvidence: true },
      citations: [],
    };
  }
}

class RecordingEvaluator implements CitationEvaluator {
  public called = false;
  evaluate(): CitationEvaluationMetrics {
    this.called = true;
    return { caseCount: 1, evidenceBoundRate: 1, caseScores: [] };
  }
}

function assertDependsOnlyOnPorts(): void {
  console.log(
    "[application] RunCitationEvaluationUseCase depends only on GenerateCitedGroundedAnswerUseCase and CitationEvaluator...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/application/RunCitationEvaluationUseCase.ts",
    ),
    "utf8",
  );
  assertTruthy(
    source.includes("./GenerateCitedGroundedAnswerUseCase"),
    "must import GenerateCitedGroundedAnswerUseCase",
  );
  assertTruthy(
    source.includes("../evaluation/CitationEvaluator"),
    "must import CitationEvaluator",
  );
  const forbidden = [
    "DefaultCitationEvaluator",
    "DefaultCitationBuilder",
    "../persistence",
  ];
  for (const reference of forbidden) {
    assertTruthy(!source.includes(reference), `must not reference "${reference}"`);
  }
}

async function assertDelegatesPerCase(): Promise<void> {
  console.log(
    "[application] execute runs cited-answer per case then delegates to evaluator...",
  );
  const generate = new FakeGenerateCited();
  const evaluator = new RecordingEvaluator();
  const useCase = new RunCitationEvaluationUseCase(
    generate as unknown as GenerateCitedGroundedAnswerUseCase,
    evaluator,
  );
  const dataset: EvaluationDataset = {
    id: "ds",
    cases: [
      {
        id: "c1",
        workspaceId: "ws",
        query: "q1",
        expectedChunkIds: [],
      },
      {
        id: "c2",
        workspaceId: "ws",
        query: "q2",
        expectedChunkIds: [],
      },
    ],
  };
  await useCase.execute({
    dataset,
    retrievalLimit: 2,
    maxCharacters: 50,
  });
  assertEqual(generate.calls, 2, "two cited-answer calls");
  assertTruthy(evaluator.called, "evaluator called");
}

async function assertRejectsEmptyDataset(): Promise<void> {
  console.log(
    "[application] execute rejects empty dataset without calling dependencies...",
  );
  const generate = new FakeGenerateCited();
  const evaluator = new RecordingEvaluator();
  const useCase = new RunCitationEvaluationUseCase(
    generate as unknown as GenerateCitedGroundedAnswerUseCase,
    evaluator,
  );
  await assertRejects(
    useCase.execute({
      dataset: { id: "ds", cases: [] },
      retrievalLimit: 1,
      maxCharacters: 10,
    }),
    "cases must not be empty",
  );
  assertEqual(generate.calls, 0, "no generate");
  assertEqual(evaluator.called, false, "no evaluate");
}

async function main(): Promise<void> {
  assertDependsOnlyOnPorts();
  await assertDelegatesPerCase();
  await assertRejectsEmptyDataset();
  console.log("RunCitationEvaluationUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
