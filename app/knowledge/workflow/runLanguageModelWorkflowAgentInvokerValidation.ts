/**
 * Validates LanguageModelWorkflowAgentInvoker with FakeLanguageModelProvider
 * (no network / API key).
 */
import { FakeLanguageModelProvider } from "../ai/FakeLanguageModelProvider";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import { asWorkflowAgentId } from "./WorkflowAgentId";
import { FakeWorkflowAgentInvoker } from "./FakeWorkflowAgentInvoker";
import { LanguageModelWorkflowAgentInvoker } from "./LanguageModelWorkflowAgentInvoker";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  console.log("[workflow-llm] synthesizer routes to LanguageModelProvider...");
  const llm = new FakeLanguageModelProvider();
  const fallback = new FakeWorkflowAgentInvoker();
  const invoker = new LanguageModelWorkflowAgentInvoker(llm, fallback);

  const synth = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-synthesizer"),
    role: "synthesizer",
    input: "knowledge:grounded:citations=1:MFA is required for VPN",
  });
  assertEqual(synth.ok, true, "synth ok");
  assertEqual(
    synth.output,
    "knowledge:grounded:citations=1:MFA is required for VPN",
    "Fake LLM echoes userMessage",
  );
  assertEqual(fallback.calls.length, 0, "fallback unused for synthesizer");

  console.log("[workflow-llm] critic routes to LanguageModelProvider...");
  const critic = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-critic"),
    role: "critic",
    input: "Draft: MFA required",
  });
  assertEqual(critic.ok, true, "critic ok");
  assertEqual(critic.output, "Draft: MFA required", "critic echoes");
  assertEqual(fallback.calls.length, 0, "fallback unused for critic");

  console.log("[workflow-llm] researcher falls back to Fake...");
  const researcher = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-researcher"),
    role: "researcher",
    input: "q",
  });
  assertEqual(researcher.ok, true, "researcher ok");
  assertEqual(
    researcher.output,
    "echo:researcher:q",
    "researcher uses Fake echo",
  );
  assertEqual(fallback.calls.length, 1, "fallback used for researcher");

  console.log("[workflow-llm] empty input fails...");
  const empty = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-synthesizer"),
    role: "synthesizer",
    input: "   ",
  });
  assertEqual(empty.ok, false, "empty not ok");
  assertTruthy(
    (empty.error ?? "").includes("non-empty"),
    "empty error message",
  );

  console.log("[workflow-llm] provider errors surface...");
  const failing: LanguageModelProvider = {
    async generate() {
      throw new Error("upstream timeout");
    },
  };
  const failingInvoker = new LanguageModelWorkflowAgentInvoker(
    failing,
    new FakeWorkflowAgentInvoker(),
  );
  const failed = await failingInvoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-synthesizer"),
    role: "synthesizer",
    input: "x",
  });
  assertEqual(failed.ok, false, "failed ok false");
  assertEqual(failed.error, "upstream timeout", "error message");

  console.log("LanguageModelWorkflowAgentInvoker validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
