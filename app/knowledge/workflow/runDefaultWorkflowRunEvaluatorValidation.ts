import { asWorkflowAgentId } from "./WorkflowAgentId";
import { DefaultWorkflowRunEvaluator } from "./DefaultWorkflowRunEvaluator";
import type { WorkflowEvaluationDataset } from "./WorkflowEvaluationDataset";
import type { WorkflowMemoryEntry } from "./WorkflowMemoryEntry";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import { asWorkflowRunId } from "./WorkflowRunId";

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

function sampleRun(
  overrides: Partial<WorkflowRunResult> = {},
): WorkflowRunResult {
  return {
    plan: {
      goal: {
        workspaceId: "workspace-a",
        objective: "obj",
        workflowRunId: asWorkflowRunId("case-1"),
      },
      steps: [],
    },
    stepResults: [
      {
        stepId: "step-1",
        agentId: asWorkflowAgentId("agent-researcher"),
        role: "researcher",
        status: "completed",
        output: "research",
      },
      {
        stepId: "step-2",
        agentId: asWorkflowAgentId("agent-synthesizer"),
        role: "synthesizer",
        status: "completed",
        output: "synth",
        handoff: {
          kind: "sequential",
          fromAgentId: asWorkflowAgentId("agent-researcher"),
          toAgentId: asWorkflowAgentId("agent-synthesizer"),
          fromStepId: "step-1",
          toStepId: "step-2",
          workspaceId: "workspace-a",
          payload: "research",
        },
      },
    ],
    status: "completed",
    workflowRunId: asWorkflowRunId("case-1"),
    ...overrides,
  };
}

function assertPassCase(): void {
  console.log("[workflow-eval] pass case with handoff + memory kinds...");
  const evaluator = new DefaultWorkflowRunEvaluator();
  const dataset: WorkflowEvaluationDataset = {
    id: "ds-pass",
    cases: [
      {
        id: "case-1",
        workspaceId: "workspace-a",
        objective: "obj",
        expectStatus: "completed",
        expectMinCompletedSteps: 2,
        expectRequiredRoles: ["researcher", "synthesizer"],
        expectHandoff: true,
        expectMemoryKinds: ["objective", "step_output", "handoff"],
      },
    ],
  };
  const memory: readonly WorkflowMemoryEntry[] = [
    {
      id: "1",
      workspaceId: "workspace-a",
      workflowRunId: asWorkflowRunId("case-1"),
      kind: "objective",
      content: "obj",
      sequence: 1,
    },
    {
      id: "2",
      workspaceId: "workspace-a",
      workflowRunId: asWorkflowRunId("case-1"),
      kind: "step_output",
      content: "research",
      sequence: 2,
    },
    {
      id: "3",
      workspaceId: "workspace-a",
      workflowRunId: asWorkflowRunId("case-1"),
      kind: "handoff",
      content: "research",
      sequence: 3,
      handoffKind: "sequential",
    },
  ];
  const metrics = evaluator.evaluate({
    dataset,
    runsByCaseId: new Map([["case-1", sampleRun()]]),
    memoryByCaseId: new Map([["case-1", memory]]),
  });
  assertEqual(metrics.passRate, 1, "passRate 1");
  assertEqual(metrics.passedCount, 1, "passedCount");
  assertEqual(metrics.caseScores[0]?.passed, true, "case passed");
}

function assertMissingRunFails(): void {
  console.log("[workflow-eval] missing-run fails...");
  const evaluator = new DefaultWorkflowRunEvaluator();
  const metrics = evaluator.evaluate({
    dataset: {
      id: "ds-missing",
      cases: [
        {
          id: "case-x",
          workspaceId: "workspace-a",
          objective: "obj",
          expectStatus: "completed",
        },
      ],
    },
    runsByCaseId: new Map(),
  });
  assertEqual(metrics.passRate, 0, "passRate 0");
  assertEqual(
    metrics.caseScores[0]?.failureReasons?.[0],
    "missing-run",
    "missing-run reason",
  );
}

function assertMissingMemoryFails(): void {
  console.log("[workflow-eval] missing-memory fails...");
  const evaluator = new DefaultWorkflowRunEvaluator();
  const metrics = evaluator.evaluate({
    dataset: {
      id: "ds-mem",
      cases: [
        {
          id: "case-1",
          workspaceId: "workspace-a",
          objective: "obj",
          expectStatus: "completed",
          expectMemoryKinds: ["objective"],
        },
      ],
    },
    runsByCaseId: new Map([["case-1", sampleRun()]]),
  });
  assertEqual(metrics.caseScores[0]?.passed, false, "failed");
  assertTruthy(
    metrics.caseScores[0]?.failureReasons?.includes("missing-memory"),
    "missing-memory reason",
  );
}

function assertEmptyDatasetThrows(): void {
  console.log("[workflow-eval] empty dataset throws...");
  const evaluator = new DefaultWorkflowRunEvaluator();
  try {
    evaluator.evaluate({
      dataset: { id: "empty", cases: [] },
      runsByCaseId: new Map(),
    });
    throw new Error("expected throw");
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes("dataset must contain at least one case"),
      `unexpected: ${text}`,
    );
  }
}

function assertStatusMismatchFails(): void {
  console.log("[workflow-eval] status mismatch fails...");
  const evaluator = new DefaultWorkflowRunEvaluator();
  const metrics = evaluator.evaluate({
    dataset: {
      id: "ds-status",
      cases: [
        {
          id: "case-1",
          workspaceId: "workspace-a",
          objective: "obj",
          expectStatus: "failed",
        },
      ],
    },
    runsByCaseId: new Map([["case-1", sampleRun({ status: "completed" })]]),
  });
  assertEqual(metrics.caseScores[0]?.passed, false, "failed");
  assertTruthy(
    metrics.caseScores[0]?.failureReasons?.some((reason) =>
      reason.startsWith("status-mismatch"),
    ),
    "status-mismatch reason",
  );
}

function main(): void {
  assertPassCase();
  assertMissingRunFails();
  assertMissingMemoryFails();
  assertEmptyDatasetThrows();
  assertStatusMismatchFails();
  console.log("Default workflow run evaluator validation succeeded.");
}

main();
