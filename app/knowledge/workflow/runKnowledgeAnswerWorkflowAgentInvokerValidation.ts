/**
 * Validates KnowledgeAnswerWorkflowAgentInvoker with a Fake knowledge port
 * (no composition / Docker / network).
 */
import { asWorkflowAgentId } from "./WorkflowAgentId";
import { FakeWorkflowAgentInvoker } from "./FakeWorkflowAgentInvoker";
import { KnowledgeAnswerWorkflowAgentInvoker } from "./KnowledgeAnswerWorkflowAgentInvoker";
import type { WorkflowKnowledgeAnswerPort } from "./WorkflowKnowledgeAnswerPort";

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
  console.log("[workflow-knowledge] researcher routes to knowledge port...");
  const calls: Array<{ workspaceId: string; query: string }> = [];
  const knowledge: WorkflowKnowledgeAnswerPort = {
    async answer(input) {
      calls.push({ ...input });
      return {
        answerText: "policy summary",
        citationCount: 2,
        insufficientEvidence: false,
      };
    },
  };
  const fallback = new FakeWorkflowAgentInvoker();
  const invoker = new KnowledgeAnswerWorkflowAgentInvoker(knowledge, fallback);

  const researcher = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-researcher"),
    role: "researcher",
    input: "security policy",
  });
  assertEqual(researcher.ok, true, "researcher ok");
  assertEqual(
    researcher.output,
    "knowledge:grounded:citations=2:policy summary",
    "researcher output format",
  );
  assertEqual(calls.length, 1, "knowledge called once");
  assertEqual(fallback.calls.length, 0, "fallback unused for researcher");

  console.log("[workflow-knowledge] synthesizer falls back to Fake...");
  const synth = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-synthesizer"),
    role: "synthesizer",
    input: "draft",
  });
  assertEqual(synth.ok, true, "synth ok");
  assertEqual(
    synth.output,
    "echo:synthesizer:draft",
    "synth uses Fake echo",
  );
  assertEqual(fallback.calls.length, 1, "fallback used for synthesizer");
  assertEqual(calls.length, 1, "knowledge not called for synthesizer");

  console.log("[workflow-knowledge] empty query fails...");
  const empty = await invoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-researcher"),
    role: "researcher",
    input: "   ",
  });
  assertEqual(empty.ok, false, "empty query not ok");
  assertTruthy(
    (empty.error ?? "").includes("non-empty"),
    "empty query error message",
  );

  console.log("[workflow-knowledge] knowledge port errors surface...");
  const failing: WorkflowKnowledgeAnswerPort = {
    async answer() {
      throw new Error("retrieval exploded");
    },
  };
  const failingInvoker = new KnowledgeAnswerWorkflowAgentInvoker(
    failing,
    new FakeWorkflowAgentInvoker(),
  );
  const failed = await failingInvoker.invoke({
    workspaceId: "workspace-a",
    agentId: asWorkflowAgentId("agent-researcher"),
    role: "researcher",
    input: "q",
  });
  assertEqual(failed.ok, false, "failed ok false");
  assertEqual(failed.error, "retrieval exploded", "error message");

  console.log("KnowledgeAnswerWorkflowAgentInvoker validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
