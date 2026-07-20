import { KNOWLEDGE_MODULE_TOOLS } from "./index";
import type { ToolExecutor } from "./ToolExecutor";
import type { ToolCallRequest } from "./ToolCallRequest";
import type { ToolCallResult } from "./ToolCallResult";
import type { ToolExecutor as TopLevelToolExecutor } from "../index";

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
 * Minimal in-file test double proving `ToolExecutor` is implementable
 * from just the exported contract types — no concrete adapter exists
 * yet (that is a later task). Returns trivial success or error-shaped
 * `ToolCallResult` values so this validation can also assert
 * type-compatibility of the result shape at both compile time (via
 * `tsc`) and runtime (via the assertions below).
 */
class FakeToolExecutor implements ToolExecutor {
  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    if (request.arguments["forceError"] === true) {
      return {
        ok: false,
        status: "failure",
        toolName: request.name,
        error: "forced error",
        durationMs: 0,
      };
    }
    return {
      ok: true,
      status: "success",
      toolName: request.name,
      result: { echoed: request.arguments },
      durationMs: 0,
    };
  }
}

function assertModuleConstant(): void {
  console.log("[tools] KNOWLEDGE_MODULE_TOOLS constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_TOOLS,
    "app/knowledge/tools",
    "unexpected KNOWLEDGE_MODULE_TOOLS value",
  );
}

async function assertToolExecutorPortContract(): Promise<void> {
  console.log("[tools] port contract (ToolExecutor) is implementable and callable...");
  const executor: ToolExecutor = new FakeToolExecutor();
  assertTruthy(typeof executor.execute === "function", "execute must be defined");

  const request: ToolCallRequest = {
    name: "generate_cited_grounded_answer",
    arguments: { workspaceId: "ws" },
    timeoutMs: 1_000,
  };
  const success = await executor.execute(request);

  assertEqual(success.ok, true, "expected ok=true for a successful execute");
  assertEqual(success.status, "success", "expected status=success for a successful execute");
  assertEqual(success.toolName, request.name, "expected toolName to echo the request name");
  assertTruthy(success.result !== undefined, "expected result to be set on a successful execute");
  assertEqual(typeof success.durationMs, "number", "expected durationMs to be a number");
  assertTruthy(success.durationMs >= 0, "expected durationMs to be non-negative");
}

async function assertToolExecutorErrorResultShape(): Promise<void> {
  console.log("[tools] ToolCallResult accommodates an ok=false error shape without a result...");
  const executor: ToolExecutor = new FakeToolExecutor();
  const failure = await executor.execute({
    name: "generate_cited_grounded_answer",
    arguments: { forceError: true },
    timeoutMs: 1_000,
  });

  assertEqual(failure.ok, false, "expected ok=false for an error execute");
  assertEqual(failure.status, "failure", "expected status=failure for an error execute");
  assertEqual(typeof failure.error, "string", "expected error to be a string on an ok=false result");
  assertEqual(failure.result, undefined, "expected result to be absent on an ok=false result");
  assertEqual(typeof failure.durationMs, "number", "expected durationMs to be a number on an error result");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[tools] top-level app/knowledge barrel re-exports the ToolExecutor contract types...");
  const isAssignableToModuleType: ToolExecutor | null =
    null as TopLevelToolExecutor | null;
  assertTruthy(
    isAssignableToModuleType === null,
    "expected the top-level and module-level ToolExecutor types to be assignable to one another",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertToolExecutorPortContract();
  await assertToolExecutorErrorResultShape();
  assertTopLevelBarrelExportsContractTypes();
  console.log("ToolExecutor contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
