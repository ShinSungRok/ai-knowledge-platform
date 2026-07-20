import { DefaultTimeoutPolicy } from "./DefaultTimeoutPolicy";
import { KNOWLEDGE_MODULE_RELIABILITY } from "./index";
import type { TimeoutPolicy } from "./TimeoutPolicy";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertModuleConstant(): void {
  console.log(
    "[reliability] KNOWLEDGE_MODULE_RELIABILITY constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_RELIABILITY,
    "app/knowledge/reliability",
    "module constant",
  );
}

async function assertSuccessBeforeTimeout(): Promise<void> {
  console.log(
    "[reliability] DefaultTimeoutPolicy returns when operation finishes before timeout...",
  );
  const policy: TimeoutPolicy = new DefaultTimeoutPolicy();
  const result = await policy.execute(async () => "fast", 200);
  assertEqual(result, "fast", "result");
}

async function assertTimeoutThrows(): Promise<void> {
  console.log(
    "[reliability] DefaultTimeoutPolicy throws when operation exceeds timeoutMs...",
  );
  const policy = new DefaultTimeoutPolicy();
  let caught: unknown;
  try {
    await policy.execute(async () => {
      await delay(100);
      return "late";
    }, 20);
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw Error");
  assertEqual(
    (caught as Error).message,
    "Operation timed out after 20ms",
    "timeout message",
  );
}

async function assertInvalidTimeoutMs(): Promise<void> {
  console.log(
    "[reliability] DefaultTimeoutPolicy rejects invalid timeoutMs...",
  );
  const policy = new DefaultTimeoutPolicy();
  for (const timeoutMs of [0, -1, 1.5, NaN]) {
    let threw = false;
    try {
      await policy.execute(async () => "x", timeoutMs);
    } catch {
      threw = true;
    }
    assertTruthy(threw, `timeoutMs=${String(timeoutMs)} must throw`);
  }
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertSuccessBeforeTimeout();
  await assertTimeoutThrows();
  await assertInvalidTimeoutMs();
  console.log("DefaultTimeoutPolicy validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
