/**
 * Result of a single {@link SqlGateway.execute} call.
 */
export interface SqlQueryResult {
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  rowCount: number;
}
