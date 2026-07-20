import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  KNOWLEDGE_MODULE_AI,
  KNOWLEDGE_MODULE_API,
  KNOWLEDGE_MODULE_APPLICATION,
  KNOWLEDGE_MODULE_CITATION,
  KNOWLEDGE_MODULE_COMPOSITION,
  KNOWLEDGE_MODULE_CONFIG,
  KNOWLEDGE_MODULE_CONTEXT,
  KNOWLEDGE_MODULE_DOMAIN,
  KNOWLEDGE_MODULE_EMBEDDING,
  KNOWLEDGE_MODULE_EVALUATION,
  KNOWLEDGE_MODULE_HTTP,
  KNOWLEDGE_MODULE_INFRA,
  KNOWLEDGE_MODULE_MCP,
  KNOWLEDGE_MODULE_TOOLS,
  KNOWLEDGE_MODULE_OBSERVABILITY,
  KNOWLEDGE_MODULE_PERSISTENCE,
  KNOWLEDGE_MODULE_PIPELINE,
  KNOWLEDGE_MODULE_PROMPT,
  KNOWLEDGE_MODULE_RAG,
  KNOWLEDGE_MODULE_RELIABILITY,
  KNOWLEDGE_MODULE_REPOSITORY,
  KNOWLEDGE_MODULE_RETRIEVAL,
  KNOWLEDGE_MODULE_SEARCH,
  KNOWLEDGE_MODULE_SECURITY,
  KNOWLEDGE_MODULE_SERVER,
} from "../app/knowledge";

const REQUIRED_PATHS = [
  "README.md",
  "package.json",
  "tsconfig.json",
  ".gitignore",
  "docs/architecture.md",
  "docs/modules.md",
  "docs/development.md",
  "docs/deployment.md",
  "docs/portfolio.md",
  "tests/README.md",
  "tests/unit",
  "tests/integration",
  "tests/e2e",
  "scripts/validate-skeleton.ts",
  "docker/Dockerfile",
  "docker/docker-compose.yml",
  "docker/README.md",
  ".cursor/rules/architecture.mdc",
  ".cursor/rules/validation.mdc",
  ".cursor/rules/development.mdc",
  ".agents/skills/validate-skeleton/SKILL.md",
  ".agents/skills/architecture-guard/SKILL.md",
  "app/knowledge/index.ts",
] as const;

const REQUIRED_MODULES = [
  KNOWLEDGE_MODULE_DOMAIN,
  KNOWLEDGE_MODULE_APPLICATION,
  KNOWLEDGE_MODULE_REPOSITORY,
  KNOWLEDGE_MODULE_PERSISTENCE,
  KNOWLEDGE_MODULE_PIPELINE,
  KNOWLEDGE_MODULE_EMBEDDING,
  KNOWLEDGE_MODULE_SEARCH,
  KNOWLEDGE_MODULE_RETRIEVAL,
  KNOWLEDGE_MODULE_CONTEXT,
  KNOWLEDGE_MODULE_PROMPT,
  KNOWLEDGE_MODULE_CITATION,
  KNOWLEDGE_MODULE_RAG,
  KNOWLEDGE_MODULE_AI,
  KNOWLEDGE_MODULE_MCP,
  KNOWLEDGE_MODULE_TOOLS,
  KNOWLEDGE_MODULE_API,
  KNOWLEDGE_MODULE_HTTP,
  KNOWLEDGE_MODULE_SERVER,
  KNOWLEDGE_MODULE_COMPOSITION,
  KNOWLEDGE_MODULE_CONFIG,
  KNOWLEDGE_MODULE_EVALUATION,
  KNOWLEDGE_MODULE_OBSERVABILITY,
  KNOWLEDGE_MODULE_RELIABILITY,
  KNOWLEDGE_MODULE_SECURITY,
  KNOWLEDGE_MODULE_INFRA,
] as const;

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertPathsExist(): void {
  for (const relativePath of REQUIRED_PATHS) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    console.log(`[skeleton] Checking ${relativePath}...`);
    assertTruthy(existsSync(absolutePath), `${relativePath} does not exist`);
  }
}

function assertModulesExport(): void {
  for (const moduleId of REQUIRED_MODULES) {
    console.log(`[skeleton] Checking barrel export ${moduleId}...`);
    assertTruthy(
      typeof moduleId === "string" && moduleId.startsWith("app/knowledge/"),
      `Invalid module export: ${String(moduleId)}`,
    );
    assertTruthy(
      existsSync(path.resolve(process.cwd(), moduleId, "index.ts")),
      `${moduleId}/index.ts does not exist`,
    );
  }
}

function assertPackageScripts(): void {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  for (const scriptName of [
    "validate:skeleton",
    "typecheck",
    "validate",
  ] as const) {
    console.log(`[skeleton] Checking package.json script ${scriptName}...`);
    assertTruthy(
      typeof scripts[scriptName] === "string" && scripts[scriptName].length > 0,
      `package.json is missing script: ${scriptName}`,
    );
  }
}

async function main(): Promise<void> {
  assertPathsExist();
  assertModulesExport();
  assertPackageScripts();
  console.log("Skeleton validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
