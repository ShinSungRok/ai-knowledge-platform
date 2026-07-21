import { KNOWLEDGE_MODULE_OBSERVABILITY } from "./index";
import { loadOtlpExporterConfig } from "./loadOtlpExporterConfig";
import type { OtlpExporterConfig } from "./OtlpExporterConfig";
import type { OtlpHttpRequest } from "./OtlpHttpRequest";
import type { OtlpHttpResponse } from "./OtlpHttpResponse";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";

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

class FakeOtlpHttpTransport implements OtlpHttpTransport {
  readonly requests: OtlpHttpRequest[] = [];

  async send(request: OtlpHttpRequest): Promise<OtlpHttpResponse> {
    this.requests.push({
      method: request.method,
      path: request.path,
      headers: { ...request.headers },
      body: request.body,
    });
    return { status: 200, body: "" };
  }
}

function assertModuleConstant(): void {
  console.log(
    "[observability] KNOWLEDGE_MODULE_OBSERVABILITY constant is exported...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_OBSERVABILITY,
    "app/knowledge/observability",
    "module constant",
  );
}

function assertConfigLoaderNullWhenUnset(): void {
  console.log(
    "[observability] loadOtlpExporterConfig returns null without endpoint...",
  );
  assertEqual(loadOtlpExporterConfig({}), null, "empty env");
  assertEqual(
    loadOtlpExporterConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: "  " }),
    null,
    "blank endpoint",
  );
}

function assertConfigLoaderAcceptsValid(): void {
  console.log(
    "[observability] loadOtlpExporterConfig loads endpoint, service, headers...",
  );
  const loaded = loadOtlpExporterConfig({
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318/",
    OTEL_SERVICE_NAME: "demo-service",
    OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Bearer tok,x-tenant=a",
  });
  assertTruthy(loaded !== null, "loaded");
  const config = loaded as OtlpExporterConfig;
  assertEqual(config.endpoint, "http://localhost:4318", "trailing slash stripped");
  assertEqual(config.serviceName, "demo-service", "serviceName");
  assertEqual(config.headers?.["Authorization"], "Bearer tok", "auth header");
  assertEqual(config.headers?.["x-tenant"], "a", "tenant header");
}

function assertDefaultServiceName(): void {
  console.log(
    "[observability] loadOtlpExporterConfig defaults serviceName...",
  );
  const loaded = loadOtlpExporterConfig({
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318",
  });
  assertEqual(
    loaded?.serviceName,
    "ai-knowledge-platform",
    "default service name",
  );
}

async function assertTransportPort(): Promise<void> {
  console.log(
    "[observability] OtlpHttpTransport port is implementable with Fake...",
  );
  const transport: OtlpHttpTransport = new FakeOtlpHttpTransport();
  const response = await transport.send({
    method: "POST",
    path: "/v1/logs",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assertEqual(response.status, 200, "status");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertConfigLoaderNullWhenUnset();
  assertConfigLoaderAcceptsValid();
  assertDefaultServiceName();
  await assertTransportPort();
  console.log("OtlpExporter contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
