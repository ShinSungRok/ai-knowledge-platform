import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ExecuteToolCallUseCase,
  type ExecuteToolCallInput,
} from "./ExecuteToolCallUseCase";
import type { ToolExecutor } from "../tools/ToolExecutor";
import type { ToolCallRequest } from "../tools/ToolCallRequest";
import type { ToolCallResult } from "../tools/ToolCallResult";

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

function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`Expected rejection containing: ${messageSubstring}`);
    },
    (error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      assertTruthy(
        text.includes(messageSubstring),
        `Expected error message to include "${messageSubstring}", got: ${text}`,
      );
    },
  );
}

class CountingToolExecutor implements ToolExecutor {
  public executeCalls = 0;
  public lastRequest: ToolCallRequest | null = null;
  public nextResult: ToolCallResult = {
    ok: true,
    status: "success",
    toolName: "generate_cited_grounded_answer",
    result: { echoed: true },
    durationMs: 1,
  };

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    this.executeCalls += 1;
    this.lastRequest = request;
    return this.nextResult;
  }
}

function assertDependsOnlyOnToolExecutorPort(): void {
  console.log("[application] ExecuteToolCallUseCase depends only on the ToolExecutor port...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/ExecuteToolCallUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../tools/ToolExecutor"'),
    "Use case must import the ToolExecutor port",
  );
  const forbiddenReferences = [
    "DefaultToolExecutor",
    "DefaultMcpToolRegistry",
    "GenerateCitedGroundedAnswerMcpTool",
    "InvokeMcpToolUseCase",
    "GenerateCitedGroundedAnswerUseCase",
    "McpToolRegistry",
    "../mcp/",
    "../citation/",
    "../rag/",
    "../prompt/",
    "../ai/",
    "../search/",
    "../persistence/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `ExecuteToolCallUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertValidDelegationAndUnchangedResult(): Promise<void> {
  console.log("[application] execute delegates to ToolExecutor.execute and returns the result unchanged...");
  const executor = new CountingToolExecutor();
  const expected: ToolCallResult = {
    ok: true,
    status: "success",
    toolName: "generate_cited_grounded_answer",
    result: {
      answer: { text: "cited", evidence: [], insufficientEvidence: true },
      citations: [],
    },
    durationMs: 12,
  };
  executor.nextResult = expected;

  const useCase = new ExecuteToolCallUseCase(executor);
  const input: ExecuteToolCallInput = {
    name: "generate_cited_grounded_answer",
    arguments: {
      workspaceId: "workspace-a",
      query: "q",
      retrievalLimit: 3,
      maxCharacters: 500,
    },
    timeoutMs: 2_000,
  };

  const result = await useCase.execute(input);

  assertEqual(executor.executeCalls, 1, "expected ToolExecutor.execute to be called exactly once");
  assertEqual(executor.lastRequest?.name, input.name, "expected name to be delegated unchanged");
  assertEqual(executor.lastRequest?.arguments, input.arguments, "expected arguments to be delegated by reference unchanged");
  assertEqual(executor.lastRequest?.timeoutMs, input.timeoutMs, "expected timeoutMs to be delegated unchanged");
  assertEqual(result, expected, "expected the executor result to be returned unchanged");
  assertEqual(result.status, "success", "expected status from the executor result");
}

async function assertRejectsInvalidInputWithoutCallingExecutor(): Promise<void> {
  console.log("[application] execute rejects invalid name/arguments/timeoutMs without calling the executor...");
  const executor = new CountingToolExecutor();
  const useCase = new ExecuteToolCallUseCase(executor);

  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "ExecuteToolCallInput must be an object",
  );
  await assertRejects(
    useCase.execute({ name: " ", arguments: {}, timeoutMs: 100 }),
    "ExecuteToolCallInput.name must be a non-empty string",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ name: "t", arguments: null, timeoutMs: 100 }),
    "ExecuteToolCallInput.arguments must be an object",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ name: "t", arguments: [], timeoutMs: 100 }),
    "ExecuteToolCallInput.arguments must be an object",
  );
  await assertRejects(
    useCase.execute({ name: "t", arguments: {}, timeoutMs: 0 }),
    "ExecuteToolCallInput.timeoutMs must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ name: "t", arguments: {}, timeoutMs: 1.5 }),
    "ExecuteToolCallInput.timeoutMs must be a positive integer",
  );

  assertEqual(executor.executeCalls, 0, "expected the executor to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnToolExecutorPort();
  await assertValidDelegationAndUnchangedResult();
  await assertRejectsInvalidInputWithoutCallingExecutor();
  console.log("ExecuteToolCallUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
