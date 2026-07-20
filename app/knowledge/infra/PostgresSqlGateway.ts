import type { PostgresPool } from "./PostgresPool";
import type { SqlGateway } from "./SqlGateway";
import type { SqlParameter } from "./SqlParameter";
import type { SqlQueryResult } from "./SqlQueryResult";

/**
 * {@link SqlGateway} adapter over a {@link PostgresPool} (`pg.Pool`-compatible).
 *
 * Binds parameters only — never concatenates user input into SQL.
 * Does not open connections itself; the caller owns the pool lifecycle.
 */
export class PostgresSqlGateway implements SqlGateway {
  constructor(private readonly pool: PostgresPool) {}

  async execute(
    sql: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult> {
    const result = await this.pool.query(sql, params);
    const rows = result.rows.map((row) => ({ ...row }));
    return {
      rows,
      rowCount: result.rowCount ?? rows.length,
    };
  }
}
