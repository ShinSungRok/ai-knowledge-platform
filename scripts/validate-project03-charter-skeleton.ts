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
 * Static Project 3 charter skeleton: docs + roadmap Active (Charter Skeleton)
 * + Project 2 remains CLOSED. Dependency-free (fs/path only).
 * Does not require Multi-Agent product/runtime implementation.
 */
function main(): void {
  const root = process.cwd();

  console.log("[project03-charter-skeleton] Checking required docs...");
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

  console.log("[project03-charter-skeleton] Checking PROJECT03 instructions...");
  const instructions = readFileSync(
    path.join(root, "docs/agent/PROJECT03_INSTRUCTIONS.md"),
    "utf8",
  );
  assertContains(
    instructions,
    "Project 3",
    "PROJECT03_INSTRUCTIONS must mention Project 3",
  );
  assertTruthy(
    instructions.includes("Multi-Agent") || instructions.includes("multi-agent"),
    "PROJECT03_INSTRUCTIONS must mention Multi-Agent",
  );
  assertContains(
    instructions,
    "Status: Active",
    "PROJECT03_INSTRUCTIONS must declare Status: Active",
  );

  console.log("[project03-charter-skeleton] Checking Project 3 roadmap...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT03_ROADMAP_STATUS.md"),
    "utf8",
  );
  assertContains(roadmap, "Sprint 38", "PROJECT03 roadmap must include Sprint 38");
  assertTruthy(
    roadmap.includes("Active (Charter Skeleton)") ||
      roadmap.includes("Active — Multi-Agent Role Contract Partial") ||
      roadmap.includes("Active — Role Contract + Workflow Orchestrator Partial"),
    "PROJECT03 roadmap must declare an Active Project 3 status phrase",
  );

  console.log(
    "[project03-charter-skeleton] Checking Project 2 remains CLOSED...",
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
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(
    portfolio,
    "Project 2: CLOSED",
    "portfolio must retain Project 2: CLOSED",
  );

  console.log("[project03-charter-skeleton] Checking package.json script...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assertTruthy(
    packageJson.scripts?.["validate:project03:charter-skeleton"],
    "package.json must define validate:project03:charter-skeleton",
  );

  console.log("Project 3 charter skeleton validation succeeded.");
}

main();
