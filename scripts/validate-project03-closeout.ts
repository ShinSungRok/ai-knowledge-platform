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

/**
 * Static Project 3 closeout: five Partial Multi-Agent capability evidence +
 * docs/scripts/source paths. Dependency-free (fs/path only).
 * Does **not** require Partial → Completed. Asserts `Project 3: CLOSED`
 * and CLOSED (Partial) on portfolio and roadmap.
 */
function main(): void {
  const root = process.cwd();

  console.log("[project03-closeout] Checking required docs...");
  const requiredDocs = [
    "docs/agent/PROJECT03_INSTRUCTIONS.md",
    "docs/progress/PROJECT03_PROGRESS.md",
    "docs/progress/PROJECT03_ROADMAP_STATUS.md",
    "docs/portfolio.md",
    "docs/progress/PROJECT02_ROADMAP_STATUS.md",
  ];
  for (const relative of requiredDocs) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("[project03-closeout] Checking portfolio Partial evidence...");
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(portfolio, "Partial", "portfolio must mention Partial");
  assertContains(
    portfolio,
    "Project 3: CLOSED",
    "portfolio must declare Project 3: CLOSED",
  );
  assertTruthy(
    portfolio.includes("CLOSED (Partial)") ||
      portfolio.includes("Project 3: CLOSED (Partial)"),
    "portfolio must declare Project 3 CLOSED (Partial)",
  );
  assertTruthy(
    portfolio.includes("Multi-Agent") || portfolio.includes("multi-agent"),
    "portfolio must mention Multi-Agent",
  );
  for (const capability of [
    "Role Contract",
    "Orchestrator",
    "Handoff",
    "Shared Workflow Memory",
    "Evaluation",
  ]) {
    assertContains(
      portfolio,
      capability,
      `portfolio must mention capability: ${capability}`,
    );
  }
  assertContains(
    portfolio,
    "Project 2: CLOSED",
    "portfolio must retain Project 2: CLOSED",
  );

  console.log("[project03-closeout] Checking roadmap Sprint 38–43 + Partial...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT03_ROADMAP_STATUS.md"),
    "utf8",
  );
  for (const sprint of [
    "Sprint 38",
    "Sprint 39",
    "Sprint 40",
    "Sprint 41",
    "Sprint 42",
    "Sprint 43",
  ]) {
    assertContains(roadmap, sprint, `roadmap must include ${sprint}`);
  }
  for (const capability of [
    "Multi-Agent Role Contract",
    "Workflow Orchestrator",
    "Agent Handoff / Delegation",
    "Shared Workflow Memory",
    "Multi-Agent Evaluation",
  ]) {
    assertContains(
      roadmap,
      capability,
      `roadmap must mention capability: ${capability}`,
    );
  }
  assertContains(roadmap, "**Partial**", "roadmap must mark capabilities Partial");
  assertContains(
    roadmap,
    "Project 3: CLOSED",
    "roadmap must declare Project 3: CLOSED",
  );
  assertContains(
    roadmap,
    "CLOSED (Partial)",
    "roadmap must declare CLOSED (Partial)",
  );
  assertContains(
    roadmap,
    "Project 2 remains CLOSED",
    "roadmap must retain Project 2 CLOSED",
  );
  assertContains(roadmap, "Sprint 44", "roadmap must include Sprint 44");

  console.log("[project03-closeout] Checking package.json scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "validate:workflow:contract",
    "validate:workflow:registry",
    "validate:workflow:orchestrator",
    "validate:workflow:handoff",
    "validate:workflow:memory",
    "validate:workflow:evaluation",
    "validate:application:eval-workflow",
    "validate:project03:charter-skeleton",
    "validate:project03:closeout",
  ]) {
    assertTruthy(scripts[name], `package.json must define ${name}`);
  }

  console.log("[project03-closeout] Checking source files...");
  const requiredSources = [
    "app/knowledge/workflow/WorkflowAgentRegistry.ts",
    "app/knowledge/workflow/DefaultWorkflowOrchestrator.ts",
    "app/knowledge/workflow/WorkflowHandoff.ts",
    "app/knowledge/workflow/InMemoryWorkflowMemoryStore.ts",
    "app/knowledge/workflow/DefaultWorkflowRunEvaluator.ts",
    "app/knowledge/application/RunWorkflowEvaluationUseCase.ts",
  ];
  for (const relative of requiredSources) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log(
    "[project03-closeout] Checking Project 2 roadmap remains CLOSED...",
  );
  const project2Roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT02_ROADMAP_STATUS.md"),
    "utf8",
  );
  assertContains(
    project2Roadmap,
    "Project 2: CLOSED",
    "PROJECT02 roadmap must retain Project 2: CLOSED",
  );

  console.log("Project 3 closeout validation succeeded.");
}

main();
