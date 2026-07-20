import type { SqlGateway } from "./SqlGateway";
import type { SqlParameter } from "./SqlParameter";
import type { SqlQueryResult } from "./SqlQueryResult";
import { KNOWLEDGE_MODULE_INFRA } from "./index";
import type {
  SqlGateway as TopLevelSqlGateway,
  SqlParameter as TopLevelSqlParameter,
  SqlQueryResult as TopLevelSqlQueryResult,
} from "../index";

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

class FakeSqlGateway implements SqlGateway {
  readonly calls: Array<{ sql: string; params: readonly SqlParameter[] }> = [];

  async execute(
    sql: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult> {
    this.calls.push({ sql, params });
    return {
      rows: [{ ok: true }],
      rowCount: 1,
    };
  }
}

function assertModuleConstant(): void {
  console.log("[infra] KNOWLEDGE_MODULE_INFRA constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_INFRA,
    "app/knowledge/infra",
    "unexpected module constant",
  );
}

async function assertPortImplementable(): Promise<void> {
  console.log(
    "[infra] SqlGateway port is implementable via FakeSqlGateway...",
  );
  const gateway: SqlGateway = new FakeSqlGateway();
  const result = await gateway.execute("SELECT 1", [1, "a", true, null]);
  assertEqual(result.rowCount, 1, "rowCount");
  assertEqual(result.rows.length, 1, "rows length");
  assertEqual(result.rows[0]!.ok, true, "row field");
}

function assertResultShape(): void {
  console.log("[infra] SqlQueryResult shape accommodates readonly rows...");
  const result: SqlQueryResult = {
    rows: [{ workspace_id: "w", id: "d1" }],
    rowCount: 1,
  };
  assertEqual(result.rowCount, 1, "rowCount");
  assertEqual(result.rows[0]!.id, "d1", "id");
}

function assertBarrelReExports(): void {
  console.log("[infra] top-level barrel re-exports SqlGateway contract...");
  const _gateway: TopLevelSqlGateway = new FakeSqlGateway();
  const _param: TopLevelSqlParameter = null;
  const _result: TopLevelSqlQueryResult = { rows: [], rowCount: 0 };
  assertTruthy(_gateway !== undefined, "gateway type");
  assertTruthy(_param === null, "param type");
  assertEqual(_result.rowCount, 0, "result type");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertPortImplementable();
  assertResultShape();
  assertBarrelReExports();
  console.log("SqlGateway contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
