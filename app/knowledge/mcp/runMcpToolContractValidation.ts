import { KNOWLEDGE_MODULE_MCP } from "./index";
import type { McpTool } from "./McpTool";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";
import type { McpTool as TopLevelMcpTool } from "../index";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";

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
 * Minimal in-file test double proving `McpTool` is implementable from
 * just the exported contract types — no concrete adapter exists yet
 * (that is a later task). Returns a trivial success or error-shaped
 * `McpToolInvokeResult` so this validation can also assert
 * type-compatibility of the result shape at both compile time (via
 * `tsc`) and runtime (via the assertions below).
 */
class FakeMcpTool implements McpTool {
  readonly definition = {
    name: "generate_cited_grounded_answer" as const,
    description: "fake tool for contract validation",
    inputKeys: ["workspaceId", "query", "retrievalLimit", "maxCharacters"] as const,
  };

  async invoke(args: Record<string, unknown>): Promise<McpToolInvokeResult> {
    if (args["forceError"] === true) {
      return {
        ok: false,
        toolName: "generate_cited_grounded_answer",
        error: "forced error",
      };
    }
    const result: CitedGroundedAnswer = {
      answer: {
        text: "ok",
        evidence: [],
        insufficientEvidence: true,
      },
      citations: [],
    };
    return {
      ok: true,
      toolName: "generate_cited_grounded_answer",
      result,
    };
  }
}

function assertModuleConstant(): void {
  console.log("[mcp] KNOWLEDGE_MODULE_MCP constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_MCP, "app/knowledge/mcp", "unexpected KNOWLEDGE_MODULE_MCP value");
}

async function assertMcpToolPortContract(): Promise<void> {
  console.log("[mcp] port contract (McpTool) is implementable and callable...");
  const tool: McpTool = new FakeMcpTool();
  assertTruthy(typeof tool.invoke === "function", "invoke must be defined");
  assertEqual(tool.definition.name, "generate_cited_grounded_answer", "expected definition.name to be the known McpToolName");
  assertTruthy(Array.isArray(tool.definition.inputKeys), "expected definition.inputKeys to be an array");

  const success = await tool.invoke({ workspaceId: "ws" });
  assertEqual(success.ok, true, "expected ok=true for a successful invoke");
  assertEqual(success.toolName, "generate_cited_grounded_answer", "expected toolName to be the known McpToolName");
  assertTruthy(success.result !== undefined, "expected result to be set on a successful invoke");
  assertEqual(typeof success.result?.answer.text, "string", "expected result.answer.text to be a string");
}

async function assertMcpToolEmptyErrorResultShape(): Promise<void> {
  console.log("[mcp] McpToolInvokeResult accommodates an ok=false error shape without a result...");
  const tool: McpTool = new FakeMcpTool();
  const failure = await tool.invoke({ forceError: true });

  assertEqual(failure.ok, false, "expected ok=false for an error invoke");
  assertEqual(failure.toolName, "generate_cited_grounded_answer", "expected toolName to remain set on an error result");
  assertEqual(typeof failure.error, "string", "expected error to be a string on an ok=false result");
  assertEqual(failure.result, undefined, "expected result to be absent on an ok=false result");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[mcp] top-level app/knowledge barrel re-exports the McpTool contract types...");
  const isAssignableToModuleType: McpTool | null = null as TopLevelMcpTool | null;
  assertTruthy(
    isAssignableToModuleType === null,
    "expected the top-level and module-level McpTool types to be assignable to one another",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertMcpToolPortContract();
  await assertMcpToolEmptyErrorResultShape();
  assertTopLevelBarrelExportsContractTypes();
  console.log("McpTool contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
