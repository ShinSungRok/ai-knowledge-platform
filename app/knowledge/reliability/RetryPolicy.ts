/**
 * Deterministic retry policy port. Implementations must not sleep/delay.
 */
export interface RetryPolicy {
  execute<T>(
    operation: () => Promise<T>,
    options: { maxAttempts: number },
  ): Promise<T>;
}
