/**
 * Timeout policy port. Cancels waiting after `timeoutMs`.
 */
export interface TimeoutPolicy {
  execute<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T>;
}
