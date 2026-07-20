import type { SqlParameter } from "./SqlParameter";
import type { SqlQueryResult } from "./SqlQueryResult";

/**
 * Source-of-Truth SQL gateway port.
 *
 * Concrete drivers (in-memory fake, later `pg`) implement this port.
 * Repository adapters bind parameters — never concatenate user input into SQL.
 */
export interface SqlGateway {
  execute(
    sql: string,
    params?: readonly SqlParameter[],
  ): Promise<SqlQueryResult>;
}
