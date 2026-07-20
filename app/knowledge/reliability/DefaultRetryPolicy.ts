import type { RetryPolicy } from "./RetryPolicy";

/**
 * Default {@link RetryPolicy}: retries failed operations up to
 * `maxAttempts` with no delay (deterministic, dependency-free).
 */
export class DefaultRetryPolicy implements RetryPolicy {
  async execute<T>(
    operation: () => Promise<T>,
    options: { maxAttempts: number },
  ): Promise<T> {
    const maxAttempts = options?.maxAttempts;
    if (
      typeof maxAttempts !== "number" ||
      !Number.isInteger(maxAttempts) ||
      maxAttempts < 1
    ) {
      throw new Error("maxAttempts must be a positive integer");
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;
        if (attempt >= maxAttempts) {
          throw error;
        }
      }
    }
    throw lastError;
  }
}
