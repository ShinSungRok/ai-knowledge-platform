import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CreateKnowledgeSourceUseCase,
  type CreateKnowledgeSourceInput,
} from "./CreateKnowledgeSourceUseCase";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`Expected rejection containing: ${messageSubstring}`);
    },
    (error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      assertTruthy(
        text.includes(messageSubstring),
        `Expected error message to include "${messageSubstring}", got: ${text}`,
      );
    },
  );
}

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] create source use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/CreateKnowledgeSourceUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../repository/KnowledgeSourceRepository"'),
    "Use case must import KnowledgeSourceRepository port",
  );
  assertTruthy(
    !source.includes("DefaultInMemoryKnowledgeSourceRepository"),
    "Use case must not import DefaultInMemoryKnowledgeSourceRepository adapter",
  );
  assertTruthy(
    !source.includes("../persistence/"),
    "Use case must not import persistence adapters",
  );
}

async function assertCreatesAndPersists(): Promise<void> {
  console.log("[application] create persists knowledge source...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const create = new CreateKnowledgeSourceUseCase(repository);

  const input: CreateKnowledgeSourceInput = {
    workspaceId: WORKSPACE_A,
    id: " source-1 ",
    name: " Internal Wiki ",
  };

  const created = await create.execute(input);
  assertEqual(created.id, "source-1", "id should be trimmed");
  assertEqual(created.workspaceId, WORKSPACE_A, "workspaceId mismatch");
  assertEqual(created.name, "Internal Wiki", "name should be trimmed");

  const stored = await repository.findById(WORKSPACE_A, "source-1");
  assertTruthy(stored, "Expected source in repository after create");
  assertEqual(stored?.name, "Internal Wiki", "stored name mismatch");
}

async function assertRejectsDuplicateId(): Promise<void> {
  console.log("[application] create rejects duplicate id within the same workspace...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const create = new CreateKnowledgeSourceUseCase(repository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "source-dup",
    name: "First",
  });

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "source-dup",
      name: "Second",
    }),
    "already exists",
  );
}

async function assertSameIdAllowedInDifferentWorkspace(): Promise<void> {
  console.log("[application] same id allowed in a different workspace...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const create = new CreateKnowledgeSourceUseCase(repository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "source-dup",
    name: "Workspace A Source",
  });

  const createdInB = await create.execute({
    workspaceId: WORKSPACE_B,
    id: "source-dup",
    name: "Workspace B Source",
  });
  assertEqual(createdInB.workspaceId, WORKSPACE_B, "workspaceId mismatch");

  const inA = await repository.findById(WORKSPACE_A, "source-dup");
  const inB = await repository.findById(WORKSPACE_B, "source-dup");
  assertEqual(inA?.name, "Workspace A Source", "workspace A source unaffected");
  assertEqual(inB?.name, "Workspace B Source", "workspace B source created independently");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] create rejects invalid input...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const create = new CreateKnowledgeSourceUseCase(repository);

  await assertRejects(
    create.execute({ workspaceId: WORKSPACE_A, id: " ", name: "Valid" }),
    "id must be a non-empty string",
  );
  await assertRejects(
    create.execute({ workspaceId: WORKSPACE_A, id: "source-x", name: "" }),
    "name must be a non-empty string",
  );
  await assertRejects(
    create.execute({ workspaceId: " ", id: "source-y", name: "Valid" }),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertCreatesAndPersists();
  await assertRejectsDuplicateId();
  await assertSameIdAllowedInDifferentWorkspace();
  await assertRejectsInvalidInput();
  console.log("CreateKnowledgeSourceUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
