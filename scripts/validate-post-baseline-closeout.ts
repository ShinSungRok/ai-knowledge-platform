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
 * Static closeout checks for post-baseline Sprints 21–30 Partial evidence.
 * Dependency-free (fs/path only). Does not reopen Charter Platform Baseline.
 */
function main(): void {
  const root = process.cwd();

  console.log("[post-baseline] Checking required docs...");
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

  console.log("[post-baseline] Checking portfolio Partial keywords...");
  const portfolio = readFileSync(path.join(root, "docs/portfolio.md"), "utf8");
  assertContains(
    portfolio,
    "Post-baseline",
    "portfolio must mention Post-baseline",
  );
  assertContains(portfolio, "Partial", "portfolio must mention Partial");
  assertTruthy(
    portfolio.includes("PostgresSqlGateway") || portfolio.includes("Postgres"),
    "portfolio must mention PostgresSqlGateway or Postgres",
  );
  assertTruthy(
    portfolio.includes("OpenSearchVectorIndex") ||
      portfolio.includes("OpenSearch"),
    "portfolio must mention OpenSearchVectorIndex or OpenSearch",
  );
  assertTruthy(
    portfolio.includes("HttpLanguageModelProvider") ||
      portfolio.includes("OTLP") ||
      portfolio.includes("POST /mcp") ||
      portfolio.includes("NodeHttpListener") ||
      portfolio.includes("ApiKey"),
    "portfolio must mention HTTP LLM / OTLP / MCP / listen / ApiKey evidence",
  );

  console.log("[post-baseline] Checking roadmap Sprint 21–30 + Partial rows...");
  const roadmap = readFileSync(
    path.join(root, "docs/progress/PROJECT02_ROADMAP_STATUS.md"),
    "utf8",
  );
  for (const sprint of [
    "Sprint 21",
    "Sprint 22",
    "Sprint 23",
    "Sprint 24",
    "Sprint 25",
    "Sprint 26",
    "Sprint 27",
    "Sprint 28",
    "Sprint 29",
    "Sprint 30",
  ]) {
    assertContains(roadmap, sprint, `roadmap must include ${sprint}`);
  }
  assertContains(roadmap, "Partial", "roadmap must include Partial status");
  for (const rowHint of [
    "Postgres",
    "OpenSearch",
    "LLM",
    "MCP",
    "NodeHttpListener",
    "AuthN",
    "OpenTelemetry",
  ]) {
    assertContains(
      roadmap,
      rowHint,
      `roadmap deferred-infra notes must mention ${rowHint}`,
    );
  }

  console.log("[post-baseline] Checking representative package.json scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "validate:infra:postgres-gateway",
    "validate:embedding:opensearch-index",
    "validate:ai:http-provider",
    "validate:api:mcp-jsonrpc",
    "validate:server:node-listener",
    "validate:security:api-key",
    "validate:observability:exporting",
    "validate:project:closeout",
    "validate:project:post-baseline-closeout",
  ]) {
    assertTruthy(scripts[name], `package.json must define ${name}`);
  }

  console.log("[post-baseline] Checking Partial adapter source files...");
  for (const relative of [
    "app/knowledge/infra/PostgresSqlGateway.ts",
    "app/knowledge/embedding/OpenSearchVectorIndex.ts",
    "app/knowledge/ai/HttpLanguageModelProvider.ts",
    "app/knowledge/mcp/DefaultMcpJsonRpcHandler.ts",
    "app/knowledge/server/NodeHttpListener.ts",
    "app/knowledge/security/ApiKeyAuthenticator.ts",
    "app/knowledge/observability/OtlpLogsExporter.ts",
  ]) {
    assertTruthy(
      existsSync(path.join(root, relative)),
      `${relative} must exist`,
    );
  }

  console.log("Post-baseline closeout validation succeeded.");
}

main();
