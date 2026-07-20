import type { TimeoutPolicy } from "./TimeoutPolicy";

/**
 * Default {@link TimeoutPolicy}: races the operation against a timer
 * using dependency-free `Promise.race` + `setTimeout`. Clears the timer
 * on success.
 */
export class DefaultTimeoutPolicy implements TimeoutPolicy {
  async execute<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    if (
      typeof timeoutMs !== "number" ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1
    ) {
      throw new Error("timeoutMs must be a positive integer");
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(`Operation timed out after ${timeoutMs}ms`),
          );
        }, timeoutMs);
      });
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }
}
