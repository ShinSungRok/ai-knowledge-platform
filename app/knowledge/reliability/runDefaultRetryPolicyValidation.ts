import { DefaultRetryPolicy } from "./DefaultRetryPolicy";
import { KNOWLEDGE_MODULE_RELIABILITY } from "./index";
import type { RetryPolicy } from "./RetryPolicy";

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
    "[reliability] KNOWLEDGE_MODULE_RELIABILITY constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_RELIABILITY,
    "app/knowledge/reliability",
    "unexpected module constant",
  );
}

async function assertSuccessOnFirstAttempt(): Promise<void> {
  console.log("[reliability] DefaultRetryPolicy returns on first success...");
  const policy: RetryPolicy = new DefaultRetryPolicy();
  let calls = 0;
  const result = await policy.execute(async () => {
    calls += 1;
    return "ok";
  }, { maxAttempts: 3 });
  assertEqual(result, "ok", "result");
  assertEqual(calls, 1, "single call");
}

async function assertRetriesThenSucceeds(): Promise<void> {
  console.log(
    "[reliability] DefaultRetryPolicy retries failures until success within maxAttempts...",
  );
  const policy = new DefaultRetryPolicy();
  let calls = 0;
  const result = await policy.execute(async () => {
    calls += 1;
    if (calls < 3) {
      throw new Error(`fail-${calls}`);
    }
    return "recovered";
  }, { maxAttempts: 3 });
  assertEqual(result, "recovered", "result");
  assertEqual(calls, 3, "three attempts");
}

async function assertFinalFailureThrowsLastError(): Promise<void> {
  console.log(
    "[reliability] DefaultRetryPolicy throws the last error after maxAttempts...",
  );
  const policy = new DefaultRetryPolicy();
  let calls = 0;
  let caught: unknown;
  try {
    await policy.execute(async () => {
      calls += 1;
      throw new Error(`fail-${calls}`);
    }, { maxAttempts: 2 });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw Error");
  assertEqual((caught as Error).message, "fail-2", "last error");
  assertEqual(calls, 2, "exactly maxAttempts");
}

async function assertInvalidMaxAttempts(): Promise<void> {
  console.log(
    "[reliability] DefaultRetryPolicy rejects invalid maxAttempts...",
  );
  const policy = new DefaultRetryPolicy();
  for (const maxAttempts of [0, -1, 1.5, NaN]) {
    let threw = false;
    try {
      await policy.execute(async () => "x", { maxAttempts });
    } catch {
      threw = true;
    }
    assertTruthy(threw, `maxAttempts=${String(maxAttempts)} must throw`);
  }
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertSuccessOnFirstAttempt();
  await assertRetriesThenSucceeds();
  await assertFinalFailureThrowsLastError();
  await assertInvalidMaxAttempts();
  console.log("DefaultRetryPolicy validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
