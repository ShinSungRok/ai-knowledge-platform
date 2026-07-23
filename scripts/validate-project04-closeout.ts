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
 * Static Project 4 closeout: five Partial LLMOps capability evidence +
 * docs/scripts/source paths. Dependency-free (fs/path only).
 * Does **not** require Partial → Completed. Asserts portfolio
 * `Project 4: CLOSED` / CLOSED (Partial). Roadmap formal
 * `Project 4: CLOSED` header is tightened in Task 213 / Sprint 51 end-state.
 */
function main(): void {
  const root = process.cwd();

  console.log("[project04-closeout] Checking required docs...");
  const requiredDocs = [
    "docs/agent/PROJECT04_INSTRUCTIONS.md",
    "docs/progress/PROJECT04_PROGRESS.md",
    "docs/progress/PROJECT04_ROADMAP_STATUS.md",
    "docs/portfolio.md",
    "docs/progress/PROJECT02_ROADMAP_STATUS.md",
    "docs/progress/PROJECT03_ROADMAP_STATUS.md",
  ];
  for (const relative of requiredDocs) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("[project04-closeout] Checking portfolio Partial evidence...");
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(portfolio, "Partial", "portfolio must mention Partial");
  assertContains(
    portfolio,
    "Project 4: CLOSED",
    "portfolio must declare Project 4: CLOSED",
  );
  assertTruthy(
    portfolio.includes("CLOSED (Partial)") ||
      portfolio.includes("Project 4: CLOSED (Partial)"),
    "portfolio must declare Project 4 CLOSED (Partial)",
  );
  assertTruthy(
    portfolio.includes("LLMOps") || portfolio.includes("Enterprise LLMOps"),
    "portfolio must mention LLMOps",
  );
  for (const capability of [
    "Experiment / Run Tracking",
    "Prompt & Model Registry",
    "Evaluation Gates / Regression Harness",
    "Deployment / Serving Configuration",
    "LLMOps Observability",
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
  assertContains(
    portfolio,
    "Project 3: CLOSED",
    "portfolio must retain Project 3: CLOSED",
  );
  assertContains(
    portfolio,
    "CLOSED (Partial)",
    "portfolio must retain CLOSED (Partial) markers",
  );

  console.log("[project04-closeout] Checking roadmap Sprint 45–50 + Partial...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT04_ROADMAP_STATUS.md"),
    "utf8",
  );
  for (const sprint of [
    "Sprint 45",
    "Sprint 46",
    "Sprint 47",
    "Sprint 48",
    "Sprint 49",
    "Sprint 50",
  ]) {
    assertContains(roadmap, sprint, `roadmap must include ${sprint}`);
  }
  for (const capability of [
    "Experiment / Run Tracking",
    "Prompt & Model Registry",
    "Evaluation Gates / Regression Harness",
    "Deployment / Serving Configuration",
    "LLMOps Observability",
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
    "Project 4: CLOSED",
    "roadmap must declare Project 4: CLOSED",
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
  assertContains(roadmap, "Sprint 51", "roadmap must include Sprint 51");
  // Formal end-state: Project 4 CLOSED (Partial) on roadmap (Task 213).
  assertTruthy(
    roadmap.includes("Project 4: CLOSED (Partial)") ||
      (roadmap.includes("Project 4: CLOSED") &&
        roadmap.includes("CLOSED (Partial)")),
    "roadmap must declare Project 4: CLOSED (Partial)",
  );

  console.log("[project04-closeout] Checking package.json scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "validate:llmops:contract",
    "validate:llmops:run-store",
    "validate:llmops:prompt-registry",
    "validate:llmops:model-registry",
    "validate:llmops:evaluation-gate",
    "validate:llmops:regression-harness",
    "validate:llmops:serving-config",
    "validate:llmops:observation-store",
    "validate:project04:charter-skeleton",
    "validate:project04:closeout",
  ]) {
    assertTruthy(scripts[name], `package.json must define ${name}`);
  }

  console.log("[project04-closeout] Checking source files...");
  const requiredSources = [
    "app/knowledge/llmops/ExperimentRunStore.ts",
    "app/knowledge/llmops/InMemoryExperimentRunStore.ts",
    "app/knowledge/llmops/PromptRegistry.ts",
    "app/knowledge/llmops/ModelRegistry.ts",
    "app/knowledge/llmops/DefaultEvaluationGateEvaluator.ts",
    "app/knowledge/llmops/DefaultRegressionHarness.ts",
    "app/knowledge/llmops/ServingConfigStore.ts",
    "app/knowledge/llmops/InMemoryServingConfigStore.ts",
    "app/knowledge/llmops/LlmopsObservationStore.ts",
    "app/knowledge/llmops/InMemoryLlmopsObservationStore.ts",
  ];
  for (const relative of requiredSources) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log(
    "[project04-closeout] Checking Project 2/3 roadmaps remain CLOSED...",
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
  const project3Roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT03_ROADMAP_STATUS.md"),
    "utf8",
  );
  assertContains(
    project3Roadmap,
    "Project 3: CLOSED",
    "PROJECT03 roadmap must retain Project 3: CLOSED",
  );
  assertContains(
    project3Roadmap,
    "CLOSED (Partial)",
    "PROJECT03 roadmap must retain CLOSED (Partial)",
  );

  console.log("Project 4 closeout validation succeeded.");
}

main();
