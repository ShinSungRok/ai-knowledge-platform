/**
 * Attribute values accepted on spans (OTLP AnyValue subset).
 */
export type SpanAttributes = Readonly<
  Record<string, string | number | boolean>
>;
