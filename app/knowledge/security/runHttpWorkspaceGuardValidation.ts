import { DefaultWorkspaceAuthorizer } from "./DefaultWorkspaceAuthorizer";
import { HttpWorkspaceGuard } from "./HttpWorkspaceGuard";

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

function assertAllowsMatchingHeader(): void {
  console.log(
    "[security] HttpWorkspaceGuard allows matching x-workspace-id header...",
  );
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  guard.assertRequest(
    {
      method: "POST",
      path: "/workspaces/workspace-a/cited-answers",
      headers: { "x-workspace-id": "workspace-a" },
    },
    "workspace-a",
  );
}

function assertHeaderNameIsCaseInsensitive(): void {
  console.log(
    "[security] HttpWorkspaceGuard reads x-workspace-id case-insensitively...",
  );
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  guard.assertRequest(
    {
      method: "POST",
      path: "/workspaces/workspace-a/cited-answers",
      headers: { "X-Workspace-Id": "workspace-a" },
    },
    "workspace-a",
  );
}

function assertMissingHeader(): void {
  console.log(
    "[security] HttpWorkspaceGuard rejects missing x-workspace-id header...",
  );
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  let caught: unknown;
  try {
    guard.assertRequest(
      { method: "POST", path: "/x", headers: {} },
      "workspace-a",
    );
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw");
  assertEqual(
    (caught as Error).message,
    "Missing x-workspace-id header",
    "missing header message",
  );
}

function assertDeniedByAuthorizer(): void {
  console.log(
    "[security] HttpWorkspaceGuard propagates authorizer denial...",
  );
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  let caught: unknown;
  try {
    guard.assertRequest(
      {
        method: "POST",
        path: "/x",
        headers: { "x-workspace-id": "other" },
      },
      "workspace-a",
    );
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

function main(): void {
  assertAllowsMatchingHeader();
  assertHeaderNameIsCaseInsensitive();
  assertMissingHeader();
  assertDeniedByAuthorizer();
  console.log("HttpWorkspaceGuard validation succeeded.");
}

main();
