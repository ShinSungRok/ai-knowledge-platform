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
 * Static Project 2 final closeout: three track CLOSED markers + portfolio
 * Project 2 CLOSED / Project 3 handoff. Dependency-free (fs/path only).
 * Does not require Partial adapters to become Completed.
 */
function main(): void {
  const root = process.cwd();

  console.log("[final-closeout] Checking required docs...");
  const requiredDocs = [
    "docs/portfolio.md",
    "docs/progress/PROJECT02_ROADMAP_STATUS.md",
    "docs/development.md",
    "README.md",
  ];
  for (const relative of requiredDocs) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("[final-closeout] Checking portfolio Project 2 CLOSED + P3 handoff...");
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(
    portfolio,
    "Project 2: CLOSED",
    "portfolio must declare Project 2: CLOSED",
  );
  assertTruthy(
    portfolio.includes("Project 3") &&
      (portfolio.includes("Multi-Agent") || portfolio.includes("handoff")),
    "portfolio must mention Project 3 Multi-Agent handoff",
  );
  assertContains(portfolio, "Partial", "portfolio must retain Partial status");

  console.log("[final-closeout] Checking three track CLOSED markers on roadmap...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT02_ROADMAP_STATUS.md"),
    "utf8",
  );
  assertTruthy(
    roadmap.includes("Charter Platform Baseline remains CLOSED") ||
      (roadmap.includes("Platform Baseline") && roadmap.includes("CLOSED")),
    "roadmap must mention Charter Platform Baseline CLOSED",
  );
  assertContains(
    roadmap,
    "Post-baseline Infrastructure Track: CLOSED (Partial)",
    "roadmap must declare post-baseline track CLOSED (Partial)",
  );
  assertContains(
    roadmap,
    "Nested Deferral Expansion Track: CLOSED (Partial)",
    "roadmap must declare nested expansion track CLOSED (Partial)",
  );
  assertContains(
    roadmap,
    "Project 2: CLOSED",
    "roadmap must declare Project 2: CLOSED",
  );
  assertContains(roadmap, "Sprint 37", "roadmap must include Sprint 37");

  console.log("[final-closeout] Checking package.json closeout scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "validate:project:closeout",
    "validate:project:post-baseline-closeout",
    "validate:project:nested-expansion-closeout",
    "validate:project:final-closeout",
  ]) {
    assertTruthy(scripts[name], `package.json must define ${name}`);
  }

  console.log("Project 2 final closeout validation succeeded.");
}

main();
