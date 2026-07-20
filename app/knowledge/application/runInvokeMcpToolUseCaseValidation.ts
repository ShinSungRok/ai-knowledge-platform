import { readFileSync } from "node:fs";
import path from "node:path";

import {
  InvokeMcpToolUseCase,
  type InvokeMcpToolInput,
} from "./InvokeMcpToolUseCase";
import type { McpToolRegistry } from "../mcp/McpToolRegistry";
import type { McpToolInvokeInput } from "../mcp/McpToolInvokeInput";
import type { McpToolInvokeResult } from "../mcp/McpToolInvokeResult";
import type { McpToolDefinition } from "../mcp/McpToolDefinition";

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

class CountingMcpToolRegistry implements McpToolRegistry {
  public invokeCalls = 0;
  public lastInput: McpToolInvokeInput | null = null;
  public nextResult: McpToolInvokeResult = {
    ok: true,
    toolName: "generate_cited_grounded_answer",
    result: {
      answer: { text: "ok", evidence: [], insufficientEvidence: true },
      citations: [],
    },
  };

  async listTools(): Promise<McpToolDefinition[]> {
    return [];
  }

  async invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult> {
    this.invokeCalls += 1;
    this.lastInput = input;
    return this.nextResult;
  }
}

function assertDependsOnlyOnMcpToolRegistryPort(): void {
  console.log("[application] InvokeMcpToolUseCase depends only on the McpToolRegistry port...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/InvokeMcpToolUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../mcp/McpToolRegistry"'),
    "Use case must import the McpToolRegistry port",
  );
  const forbiddenReferences = [
    "DefaultMcpToolRegistry",
    "GenerateCitedGroundedAnswerMcpTool",
    "GenerateCitedGroundedAnswerUseCase",
    "GenerateGroundedAnswerUseCase",
    "DefaultCitationBuilder",
    "DefaultGroundedAnswerAssembler",
    "FakeLanguageModelProvider",
    "../citation/",
    "../rag/",
    "../prompt/",
    "../ai/",
    "../search/",
    "../persistence/",
    "../embedding/",
    "../retrieval/",
    "../context/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `InvokeMcpToolUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertValidDelegationAndUnchangedResult(): Promise<void> {
  console.log("[application] execute delegates to McpToolRegistry.invoke and returns the result unchanged...");
  const registry = new CountingMcpToolRegistry();
  const expected: McpToolInvokeResult = {
    ok: true,
    toolName: "generate_cited_grounded_answer",
    result: {
      answer: {
        text: "cited answer",
        evidence: [
          {
            sourceId: "source-1",
            documentId: "doc-1",
            chunkId: "chunk-1",
            score: 0.9,
            text: "evidence",
          },
        ],
        insufficientEvidence: false,
      },
      citations: [
        {
          id: "cite:source-1:doc-1:chunk-1",
          sourceId: "source-1",
          documentId: "doc-1",
          chunkId: "chunk-1",
          score: 0.9,
          excerpt: "evidence",
        },
      ],
    },
  };
  registry.nextResult = expected;

  const useCase = new InvokeMcpToolUseCase(registry);
  const input: InvokeMcpToolInput = {
    name: "generate_cited_grounded_answer",
    arguments: {
      workspaceId: "workspace-a",
      query: "q",
      retrievalLimit: 3,
      maxCharacters: 500,
    },
  };

  const result = await useCase.execute(input);

  assertEqual(registry.invokeCalls, 1, "expected McpToolRegistry.invoke to be called exactly once");
  assertEqual(registry.lastInput?.name, input.name, "expected name to be delegated unchanged");
  assertEqual(registry.lastInput?.arguments, input.arguments, "expected arguments to be delegated by reference unchanged");
  assertEqual(result, expected, "expected the registry result to be returned unchanged");
  assertEqual(result.ok, true, "expected ok=true from the registry result");
  assertEqual(result.result?.answer.text, "cited answer", "expected result payload to match the registry result");
}

async function assertRejectsInvalidInputWithoutCallingRegistry(): Promise<void> {
  console.log("[application] execute rejects invalid name/arguments without calling the registry...");
  const registry = new CountingMcpToolRegistry();
  const useCase = new InvokeMcpToolUseCase(registry);

  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "InvokeMcpToolInput must be an object",
  );
  await assertRejects(
    useCase.execute({ name: " ", arguments: {} }),
    "InvokeMcpToolInput.name must be a non-empty string",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ name: "generate_cited_grounded_answer", arguments: null }),
    "InvokeMcpToolInput.arguments must be an object",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ name: "generate_cited_grounded_answer", arguments: [] }),
    "InvokeMcpToolInput.arguments must be an object",
  );

  assertEqual(registry.invokeCalls, 0, "expected the registry to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnMcpToolRegistryPort();
  await assertValidDelegationAndUnchangedResult();
  await assertRejectsInvalidInputWithoutCallingRegistry();
  console.log("InvokeMcpToolUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
