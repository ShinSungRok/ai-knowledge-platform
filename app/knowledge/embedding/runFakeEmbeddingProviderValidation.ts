import { FakeEmbeddingProvider } from "./FakeEmbeddingProvider";
import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingProvider } from "./EmbeddingProvider";

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

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected async throw containing: ${messageSubstring}`);
}

async function assertPortContract(): Promise<void> {
  console.log("[embedding] port contract (EmbeddingProvider)...");
  const provider: EmbeddingProvider = new FakeEmbeddingProvider();
  assertTruthy(typeof provider.embed === "function", "embed must be defined");
}

async function assertFixedDimension(): Promise<void> {
  console.log("[embedding] embed always returns a vector of EMBEDDING_VECTOR_DIMENSION finite numbers...");
  const provider: EmbeddingProvider = new FakeEmbeddingProvider();

  const vector = await provider.embed("hello world");
  assertEqual(vector.length, EMBEDDING_VECTOR_DIMENSION, "vector length must equal EMBEDDING_VECTOR_DIMENSION");
  for (const value of vector) {
    assertTruthy(Number.isFinite(value), `every vector value must be finite (got ${value})`);
  }

  const shortVector = await provider.embed("a");
  assertEqual(shortVector.length, EMBEDDING_VECTOR_DIMENSION, "vector length must be fixed even for short input");
  for (const value of shortVector) {
    assertTruthy(Number.isFinite(value), `every vector value must be finite for short input (got ${value})`);
  }
}

async function assertDeterministicOutput(): Promise<void> {
  console.log("[embedding] embed is deterministic across repeated calls on the same input...");
  const provider: EmbeddingProvider = new FakeEmbeddingProvider();

  const first = await provider.embed("the quick brown fox");
  const second = await provider.embed("the quick brown fox");

  assertEqual(first.length, second.length, "expected the same vector length across repeated calls");
  for (let i = 0; i < first.length; i += 1) {
    assertEqual(first[i], second[i], `vector[${i}] must be identical across repeated calls`);
  }
}

async function assertUnicodeCodePointSafety(): Promise<void> {
  console.log("[embedding] embed splits input by Unicode code point, never mid-surrogate-pair...");
  const provider: EmbeddingProvider = new FakeEmbeddingProvider();

  // Each emoji is one Unicode code point but two UTF-16 code units.
  const vector = await provider.embed("😀😁😂😃😄");
  assertEqual(vector.length, EMBEDDING_VECTOR_DIMENSION, "vector length must equal EMBEDDING_VECTOR_DIMENSION for Unicode input");
  for (const value of vector) {
    assertTruthy(Number.isFinite(value), `every vector value must be finite for Unicode input (got ${value})`);
  }

  // Same Unicode input must remain deterministic too.
  const repeated = await provider.embed("😀😁😂😃😄");
  for (let i = 0; i < vector.length; i += 1) {
    assertEqual(vector[i], repeated[i], `Unicode vector[${i}] must be identical across repeated calls`);
  }
}

async function assertRejectsEmptyOrWhitespaceInput(): Promise<void> {
  console.log("[embedding] embed rejects an empty or whitespace-only string...");
  const provider: EmbeddingProvider = new FakeEmbeddingProvider();

  await assertThrowsAsync(
    () => provider.embed(""),
    "must be a non-empty, non-whitespace string",
  );
  await assertThrowsAsync(
    () => provider.embed("   "),
    "must be a non-empty, non-whitespace string",
  );
  await assertThrowsAsync(
    () => provider.embed("\t\n  "),
    "must be a non-empty, non-whitespace string",
  );
}

async function assertOutputIsIndependentAcrossCalls(): Promise<void> {
  console.log("[embedding] embed output arrays are independent across calls...");
  const provider: EmbeddingProvider = new FakeEmbeddingProvider();

  const first = await provider.embed("abcdef");
  first[0] = Number.NaN;
  first.push(999);

  const second = await provider.embed("abcdef");
  assertEqual(second.length, EMBEDDING_VECTOR_DIMENSION, "a mutated prior result must not affect a fresh embed() call's length");
  assertTruthy(
    second.every((value) => Number.isFinite(value)),
    "a mutated prior result must not affect a fresh embed() call's values",
  );
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertFixedDimension();
  await assertDeterministicOutput();
  await assertUnicodeCodePointSafety();
  await assertRejectsEmptyOrWhitespaceInput();
  await assertOutputIsIndependentAcrossCalls();
  console.log("FakeEmbeddingProvider validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
