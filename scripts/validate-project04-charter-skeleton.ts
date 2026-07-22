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
 * Static Project 4 charter skeleton: docs + Active (Charter Skeleton) +
 * Project 2/3 CLOSED markers. Dependency-free (fs/path only).
 * Does not require LLMOps product/runtime implementation.
 */
function main(): void {
  const root = process.cwd();

  console.log("[project04-charter-skeleton] Checking required docs...");
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

  console.log("[project04-charter-skeleton] Checking PROJECT04 instructions...");
  const instructions = readFileSync(
    path.join(root, "docs/agent/PROJECT04_INSTRUCTIONS.md"),
    "utf8",
  );
  assertContains(
    instructions,
    "Project 4",
    "PROJECT04_INSTRUCTIONS must mention Project 4",
  );
  assertTruthy(
    instructions.includes("LLMOps") || instructions.includes("Enterprise LLMOps"),
    "PROJECT04_INSTRUCTIONS must mention LLMOps",
  );
  assertContains(
    instructions,
    "Status: Active",
    "PROJECT04_INSTRUCTIONS must declare Status: Active",
  );

  console.log("[project04-charter-skeleton] Checking Project 4 roadmap...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT04_ROADMAP_STATUS.md"),
    "utf8",
  );
  assertContains(roadmap, "Sprint 45", "PROJECT04 roadmap must include Sprint 45");
  assertTruthy(
    roadmap.includes("Active (Charter Skeleton)") ||
      roadmap.includes("Active — Experiment / Run Tracking Partial") ||
      roadmap.includes(
        "Active — Run Tracking + Prompt & Model Registry Partial",
      ) ||
      roadmap.includes(
        "Active — Run Tracking + Registry + Evaluation Gates Partial",
      ),
    "PROJECT04 roadmap must declare an Active charter/Partial status phrase",
  );
  assertContains(
    roadmap,
    "Project 2 remains CLOSED",
    "PROJECT04 roadmap must retain Project 2 CLOSED",
  );
  assertContains(
    roadmap,
    "CLOSED (Partial)",
    "PROJECT04 roadmap must retain Project 3 CLOSED (Partial)",
  );

  console.log(
    "[project04-charter-skeleton] Checking Project 2/3 remain CLOSED...",
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
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
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

  console.log("[project04-charter-skeleton] Checking package.json script...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assertTruthy(
    packageJson.scripts?.["validate:project04:charter-skeleton"],
    "package.json must define validate:project04:charter-skeleton",
  );

  console.log("Project 4 charter skeleton validation succeeded.");
}

main();
