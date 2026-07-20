import { DefaultWorkspaceAuthorizer } from "./DefaultWorkspaceAuthorizer";
import { KNOWLEDGE_MODULE_SECURITY } from "./index";
import type { WorkspaceAuthorizer } from "./WorkspaceAuthorizer";

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

function assertModuleConstant(): void {
  console.log(
    "[security] KNOWLEDGE_MODULE_SECURITY constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_SECURITY,
    "app/knowledge/security",
    "unexpected module constant",
  );
}

function assertAllowsMatchingWorkspace(): void {
  console.log(
    "[security] DefaultWorkspaceAuthorizer allows matching workspace ids...",
  );
  const authorizer: WorkspaceAuthorizer = new DefaultWorkspaceAuthorizer();
  authorizer.authorize({
    workspaceId: "workspace-a",
    principalWorkspaceId: "workspace-a",
  });
}

function assertDeniesMismatch(): void {
  console.log(
    "[security] DefaultWorkspaceAuthorizer denies mismatched workspace ids...",
  );
  const authorizer = new DefaultWorkspaceAuthorizer();
  let caught: unknown;
  try {
    authorizer.authorize({
      workspaceId: "workspace-a",
      principalWorkspaceId: "workspace-b",
    });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw");
  assertEqual(
    (caught as Error).message,
    "Workspace access denied",
    "denied message",
  );
}

function assertRejectsEmptyIds(): void {
  console.log(
    "[security] DefaultWorkspaceAuthorizer rejects empty workspace ids...",
  );
  const authorizer = new DefaultWorkspaceAuthorizer();
  for (const input of [
    { workspaceId: "", principalWorkspaceId: "a" },
    { workspaceId: "a", principalWorkspaceId: "  " },
  ]) {
    let threw = false;
    try {
      authorizer.authorize(input);
    } catch {
      threw = true;
    }
    assertTruthy(threw, `must reject ${JSON.stringify(input)}`);
  }
}

function main(): void {
  assertModuleConstant();
  assertAllowsMatchingWorkspace();
  assertDeniesMismatch();
  assertRejectsEmptyIds();
  console.log("DefaultWorkspaceAuthorizer validation succeeded.");
}

main();
