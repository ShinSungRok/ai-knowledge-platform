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
 * Static closeout checks for nested deferral expansion Sprints 32–35.
 * Dependency-free (fs/path only). Does not reopen Charter or post-baseline
 * tracks, and does not mark Partial adapters as Completed.
 */
function main(): void {
  const root = process.cwd();

  console.log("[nested-expansion] Checking required docs...");
  const requiredDocs = [
    "docs/portfolio.md",
    "docs/progress/PROJECT02_ROADMAP_STATUS.md",
    "docs/deployment.md",
    "docs/modules.md",
  ];
  for (const relative of requiredDocs) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("[nested-expansion] Checking portfolio Sprint 32–35 keywords...");
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(portfolio, "Partial", "portfolio must mention Partial");
  assertTruthy(
    portfolio.includes("JWT") ||
      portfolio.includes("Hs256JwtAuthenticator") ||
      portfolio.includes("OIDC"),
    "portfolio must mention JWT / OIDC-lite evidence",
  );
  assertTruthy(
    portfolio.includes("/metrics") || portfolio.includes("Prometheus"),
    "portfolio must mention Prometheus /metrics evidence",
  );
  assertTruthy(
    portfolio.includes("ExportingTracer") ||
      portfolio.includes("OtlpTracesExporter") ||
      portfolio.includes("tracing") ||
      portfolio.includes("traceparent"),
    "portfolio must mention tracing / ExportingTracer evidence",
  );
  assertTruthy(
    portfolio.includes("StdioMcpJsonRpcSession") ||
      portfolio.includes("MCP stdio") ||
      portfolio.includes("stdio"),
    "portfolio must mention MCP stdio evidence",
  );

  console.log("[nested-expansion] Checking roadmap Sprint 32–35 rows...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT02_ROADMAP_STATUS.md"),
    "utf8",
  );
  for (const sprint of [
    "Sprint 32",
    "Sprint 33",
    "Sprint 34",
    "Sprint 35",
  ]) {
    assertContains(roadmap, sprint, `roadmap must include ${sprint}`);
  }
  assertContains(roadmap, "Partial", "roadmap must include Partial status");
  assertTruthy(
    roadmap.includes("JWT") || roadmap.includes("OIDC"),
    "roadmap must mention JWT/OIDC",
  );
  assertTruthy(
    roadmap.includes("/metrics") || roadmap.includes("Prometheus"),
    "roadmap must mention Prometheus /metrics",
  );
  assertTruthy(
    roadmap.includes("Tracing") ||
      roadmap.includes("traces") ||
      roadmap.includes("ExportingTracer"),
    "roadmap must mention tracing/traces",
  );
  assertTruthy(
    roadmap.includes("stdio") || roadmap.includes("StdioMcpJsonRpcSession"),
    "roadmap must mention MCP stdio",
  );
  assertContains(
    roadmap,
    "Nested Deferral Expansion Track: CLOSED (Partial)",
    "roadmap must declare nested deferral expansion track CLOSED (Partial)",
  );
  assertContains(roadmap, "Sprint 36", "roadmap must include Sprint 36");

  console.log("[nested-expansion] Checking package.json scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "validate:security:jwt-hs256",
    "validate:security:jwt-jwks",
    "validate:http:prometheus-scrape",
    "validate:observability:prometheus-format",
    "validate:http:observing-tracing",
    "validate:observability:otlp-traces",
    "validate:mcp:stdio-session",
    "validate:composition:mcp-stdio",
    "validate:project:post-baseline-closeout",
    "validate:project:nested-expansion-closeout",
  ]) {
    assertTruthy(scripts[name], `package.json must define ${name}`);
  }

  console.log("[nested-expansion] Checking expansion source files...");
  for (const relative of [
    "app/knowledge/security/Hs256JwtAuthenticator.ts",
    "app/knowledge/security/Rs256JwtAuthenticator.ts",
    "app/knowledge/observability/prometheusText.ts",
    "app/knowledge/observability/OtlpTracesExporter.ts",
    "app/knowledge/observability/ExportingTracer.ts",
    "app/knowledge/mcp/StdioMcpJsonRpcSession.ts",
  ]) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("Nested expansion closeout validation succeeded.");
}

main();
