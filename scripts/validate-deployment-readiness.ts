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
  console.log("[deployment] Checking docker/Dockerfile multi-stage markers...");
  const dockerfilePath = path.join(root, "docker/Dockerfile");
  assertTruthy(existsSync(dockerfilePath), "docker/Dockerfile must exist");
  const dockerfile = readFileSync(dockerfilePath, "utf8");
  assertContains(dockerfile, "AS deps", "Dockerfile must include AS deps");
  assertContains(dockerfile, "AS builder", "Dockerfile must include AS builder");
  assertContains(dockerfile, "AS runner", "Dockerfile must include AS runner");

  console.log("[deployment] Checking docker/docker-compose.yml services...");
  const composePath = path.join(root, "docker/docker-compose.yml");
  assertTruthy(existsSync(composePath), "docker/docker-compose.yml must exist");
  const compose = readFileSync(composePath, "utf8");
  assertContains(compose, "postgres:", "compose must define postgres service");
  assertContains(compose, "opensearch:", "compose must define opensearch service");

  console.log("[deployment] Checking package.json scripts...");
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  assertTruthy(scripts["infra:config"], "package.json must define infra:config");
  assertTruthy(scripts.validate, "package.json must define validate");
  assertTruthy(scripts.typecheck, "package.json must define typecheck");

  console.log("[deployment] Checking composition/server/api entry exports...");
  const compositionIndex = readFileSync(
    path.join(root, "app/knowledge/composition/index.ts"),
    "utf8",
  );
  const serverIndex = readFileSync(
    path.join(root, "app/knowledge/server/index.ts"),
    "utf8",
  );
  assertContains(
    compositionIndex,
    "createOperationsKnowledgeServer",
    "composition must export createOperationsKnowledgeServer",
  );
  assertContains(
    compositionIndex,
    "createInMemoryKnowledgeServer",
    "composition must export createInMemoryKnowledgeServer",
  );
  assertContains(
    serverIndex,
    "DefaultKnowledgeServer",
    "server must export DefaultKnowledgeServer",
  );

  console.log("[deployment] Checking docs/deployment.md...");
  assertTruthy(
    existsSync(path.join(root, "docs/deployment.md")),
    "docs/deployment.md must exist",
  );

  console.log("Deployment readiness validation succeeded.");
}

main();
