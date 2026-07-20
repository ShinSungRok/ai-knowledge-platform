import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertContains(haystack: string, needle: string, message: string): void {
  assertTruthy(haystack.includes(needle), message);
}

function main(): void {
  const root = process.cwd();

  console.log("[closeout] Checking required Project 2 docs...");
  const requiredDocs = [
    "docs/portfolio.md",
    "docs/architecture.md",
    "docs/modules.md",
    "docs/deployment.md",
    "docs/development.md",
    "docs/progress/PROJECT02_ROADMAP_STATUS.md",
  ];
  for (const relative of requiredDocs) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("[closeout] Checking portfolio capability keywords...");
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(portfolio, "MCP", "portfolio must mention MCP");
  assertTruthy(
    portfolio.includes("Tool Calling") || portfolio.includes("Agent"),
    "portfolio must mention Tool Calling or Agent",
  );
  assertContains(portfolio, "Evaluation", "portfolio must mention Evaluation");
  assertContains(portfolio, "Runtime", "portfolio must mention Runtime");
  assertContains(portfolio, "Operations", "portfolio must mention Operations");

  console.log("[closeout] Checking roadmap status Completed/Deferred markers...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT02_ROADMAP_STATUS.md"),
    "utf8",
  );
  assertContains(roadmap, "Completed", "roadmap status must include Completed");
  assertContains(roadmap, "Deferred", "roadmap status must include Deferred");

  console.log("[closeout] Checking package.json closeout scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "validate",
    "typecheck",
    "validate:deployment:readiness",
    "validate:composition:operations",
    "validate:evaluation:citation",
    "validate:server:lifecycle",
  ]) {
    assertTruthy(scripts[name], `package.json must define ${name}`);
  }

  console.log("[closeout] Checking baseline export presence in barrels...");
  const knowledgeIndex = readFileSync(
    path.join(root, "app/knowledge/index.ts"),
    "utf8",
  );
  const compositionIndex = readFileSync(
    path.join(root, "app/knowledge/composition/index.ts"),
    "utf8",
  );
  const applicationIndex = readFileSync(
    path.join(root, "app/knowledge/application/index.ts"),
    "utf8",
  );
  const jobsIndex = readFileSync(
    path.join(root, "app/knowledge/jobs/index.ts"),
    "utf8",
  );
  const evaluationIndex = readFileSync(
    path.join(root, "app/knowledge/evaluation/index.ts"),
    "utf8",
  );

  assertTruthy(
    compositionIndex.includes("createOperationsKnowledgeServer") ||
      knowledgeIndex.includes("createOperationsKnowledgeServer"),
    "createOperationsKnowledgeServer must be exported",
  );
  assertTruthy(
    compositionIndex.includes("createInMemoryKnowledgeComposition") ||
      knowledgeIndex.includes("createInMemoryKnowledgeComposition"),
    "createInMemoryKnowledgeComposition must be exported",
  );
  assertTruthy(
    applicationIndex.includes("GenerateCitedGroundedAnswerUseCase") ||
      knowledgeIndex.includes("GenerateCitedGroundedAnswerUseCase"),
    "GenerateCitedGroundedAnswerUseCase must be exported",
  );
  assertTruthy(
    applicationIndex.includes("RunAgentUseCase") ||
      knowledgeIndex.includes("RunAgentUseCase"),
    "RunAgentUseCase must be exported",
  );
  assertTruthy(
    jobsIndex.includes("DefaultJobProcessor") ||
      knowledgeIndex.includes("DefaultJobProcessor"),
    "DefaultJobProcessor must be exported",
  );
  assertTruthy(
    evaluationIndex.includes("DefaultRetrievalEvaluator") ||
      knowledgeIndex.includes("DefaultRetrievalEvaluator"),
    "DefaultRetrievalEvaluator must be exported",
  );

  console.log("[closeout] Checking Progress Log includes Task 85...");
  const progress = readFileSync(
    path.join(root, "docs/progress/PROJECT02_PROGRESS.md"),
    "utf8",
  );
  assertContains(progress, "## Task 85", "progress log must include ## Task 85");

  console.log("Project closeout validation succeeded.");
}

main();
