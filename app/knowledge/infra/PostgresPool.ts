import type { SqlParameter } from "./SqlParameter";

/**
 * Minimal pool surface compatible with `pg.Pool` structural typing.
 * Composition injects `new Pool(...)` without coupling repositories to `pg`.
 */
export interface PostgresPool {
  query(
    text: string,
    params?: readonly SqlParameter[],
  ): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
  }>;
}
