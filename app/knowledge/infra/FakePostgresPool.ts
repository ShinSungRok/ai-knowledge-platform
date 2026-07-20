import type { PostgresPool } from "./PostgresPool";
import { InMemorySqlGateway } from "./InMemorySqlGateway";
import type { SqlParameter } from "./SqlParameter";

/**
 * Validation-only {@link PostgresPool} that delegates to
 * {@link InMemorySqlGateway}. No network, Docker, or real Postgres.
 */
export class FakePostgresPool implements PostgresPool {
  private readonly gateway = new InMemorySqlGateway();

  async query(
    text: string,
    params?: readonly SqlParameter[],
  ): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
  }> {
    const result = await this.gateway.execute(text, params ?? []);
    return {
      rows: result.rows.map((row) => ({ ...row })),
      rowCount: result.rowCount,
    };
  }
}
