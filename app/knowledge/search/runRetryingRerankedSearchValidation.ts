import type { DocumentChunk } from "../domain/DocumentChunk";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { RerankedSearch } from "./RerankedSearch";
import { RetryingRerankedSearch } from "./RetryingRerankedSearch";

const WORKSPACE_A = "workspace-a";

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

function chunk(id: string): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id,
    documentId: `${id}-doc`,
    text: "body",
    order: 0,
  };
}

function emptyResult(query: string): RetrievalResult {
  return { query, chunks: [] };
}

function nonEmptyResult(query: string, chunkId: string): RetrievalResult {
  return { query, chunks: [{ chunk: chunk(chunkId), score: 0.9 }] };
}

class ScriptedRerankedSearch implements RerankedSearch {
  readonly calls: RetrievalInput[] = [];
  private index = 0;

  constructor(private readonly results: RetrievalResult[]) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    this.calls.push(input);
    const result = this.results[this.index];
    this.index += 1;
    if (result === undefined) {
      throw new Error("ScriptedRerankedSearch ran out of scripted results");
    }
    return result;
  }
}

class ThrowingRerankedSearch implements RerankedSearch {
  callCount = 0;

  async search(): Promise<RetrievalResult> {
    this.callCount += 1;
    throw new Error("boom");
  }
}

function input(query = "query"): RetrievalInput {
  return { workspaceId: WORKSPACE_A, query, limit: 5 };
}

async function assertReturnsImmediatelyOnFirstSuccess(): Promise<void> {
  console.log("[search] RetryingRerankedSearch returns immediately when first attempt succeeds...");
  const inner = new ScriptedRerankedSearch([nonEmptyResult("q", "chunk-1")]);
  const retrying = new RetryingRerankedSearch(inner, 3);
  const result = await retrying.search(input("q"));
  assertEqual(inner.calls.length, 1, "one call");
  assertEqual(result.chunks.length, 1, "one chunk");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-1", "chunk id");
}

async function assertRetriesUntilNonEmpty(): Promise<void> {
  console.log("[search] RetryingRerankedSearch retries after an empty result until success...");
  const inner = new ScriptedRerankedSearch([
    emptyResult("q"),
    emptyResult("q"),
    nonEmptyResult("q", "chunk-3"),
  ]);
  const retrying = new RetryingRerankedSearch(inner, 3);
  const result = await retrying.search(input("q"));
  assertEqual(inner.calls.length, 3, "three calls");
  assertEqual(result.chunks.length, 1, "one chunk on third attempt");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-3", "chunk id from third attempt");
}

async function assertGivesUpAfterMaxAttempts(): Promise<void> {
  console.log("[search] RetryingRerankedSearch gives up and returns the last empty result...");
  const inner = new ScriptedRerankedSearch([
    emptyResult("q"),
    emptyResult("q"),
    emptyResult("q"),
  ]);
  const retrying = new RetryingRerankedSearch(inner, 3);
  const result = await retrying.search(input("q"));
  assertEqual(inner.calls.length, 3, "three calls, no more");
  assertEqual(result.chunks.length, 0, "still empty after exhausting attempts");
}

async function assertDoesNotRetryOnThrow(): Promise<void> {
  console.log("[search] RetryingRerankedSearch does not retry a thrown error...");
  const inner = new ThrowingRerankedSearch();
  const retrying = new RetryingRerankedSearch(inner, 3);
  await assertThrowsAsync(() => retrying.search(input("q")), "boom");
  assertEqual(inner.callCount, 1, "only one call, error propagates immediately");
}

async function assertPassesInputUnchangedOnEveryAttempt(): Promise<void> {
  console.log("[search] RetryingRerankedSearch passes the same input to every retry...");
  const inner = new ScriptedRerankedSearch([
    emptyResult("q"),
    nonEmptyResult("q", "chunk-2"),
  ]);
  const retrying = new RetryingRerankedSearch(inner, 3);
  const requestedInput = input("same query");
  await retrying.search(requestedInput);
  assertEqual(inner.calls.length, 2, "two calls");
  assertEqual(inner.calls[0]?.query, "same query", "first call query");
  assertEqual(inner.calls[1]?.query, "same query", "second call query");
  assertEqual(inner.calls[0]?.workspaceId, WORKSPACE_A, "first call workspaceId");
  assertEqual(inner.calls[1]?.limit, 5, "second call limit");
}

function assertConstructorRejectsInvalidMaxAttempts(): void {
  console.log("[search] RetryingRerankedSearch rejects a non-positive-integer maxAttempts...");
  const inner = new ScriptedRerankedSearch([nonEmptyResult("q", "chunk-1")]);
  let threw = false;
  try {
    // eslint-disable-next-line no-new
    new RetryingRerankedSearch(inner, 0);
  } catch (error) {
    threw = true;
    const message = error instanceof Error ? error.message : String(error);
    assertTruthy(
      message.includes("maxAttempts must be a positive integer"),
      `unexpected message: ${message}`,
    );
  }
  assertTruthy(threw, "expected throw for maxAttempts=0");

  threw = false;
  try {
    // eslint-disable-next-line no-new
    new RetryingRerankedSearch(inner, 1.5);
  } catch {
    threw = true;
  }
  assertTruthy(threw, "expected throw for non-integer maxAttempts");
}

async function main(): Promise<void> {
  await assertReturnsImmediatelyOnFirstSuccess();
  await assertRetriesUntilNonEmpty();
  await assertGivesUpAfterMaxAttempts();
  await assertDoesNotRetryOnThrow();
  await assertPassesInputUnchangedOnEveryAttempt();
  assertConstructorRejectsInvalidMaxAttempts();
  console.log("RetryingRerankedSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
