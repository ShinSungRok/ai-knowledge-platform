import type { Logger } from "../observability/Logger";
import type { Metrics } from "../observability/Metrics";
import { toPrometheusText } from "../observability/prometheusText";
import type { HttpRequest } from "./HttpRequest";
import type { HttpResponse } from "./HttpResponse";
import type { HttpRouter } from "./HttpRouter";

/**
 * HttpRouter decorator that records request start/finish logs and an
 * `http.requests` counter around an inner router. Re-throws after error log.
 */
export class ObservingHttpRouter implements HttpRouter {
  constructor(
    private readonly inner: HttpRouter,
    private readonly logger: Logger,
    private readonly metrics: Metrics,
  ) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    this.logger.log({
      level: "info",
      message: "http.request.start",
      attributes: {
        method: request.method,
        path: request.path,
      },
    });

    try {
      const isMetricsScrape =
        request.method === "GET" && request.path === "/metrics";

      let response: HttpResponse;

      if (isMetricsScrape) {
        // Important: snapshot metrics before incrementing `http.requests`,
        // so the response doesn't include its own increment.
        const points = this.metrics.getPoints();
        response = {
          status: 200,
          headers: { "content-type": "text/plain; version=0.0.4" },
          body: toPrometheusText(points),
        };
      } else {
        response = await this.inner.handle(request);
      }

      this.logger.log({
        level: "info",
        message: "http.request.finish",
        attributes: {
          method: request.method,
          path: request.path,
          status: response.status,
        },
      });

      // Keep the original behavior: increment on the success path only.
      this.metrics.increment("http.requests", {
        method: request.method,
        path: request.path,
        status: String(response.status),
      });
      return response;
    } catch (error: unknown) {
      this.logger.log({
        level: "error",
        message: "http.request.error",
        attributes: {
          method: request.method,
          path: request.path,
        },
      });
      throw error;
    }
  }
}
