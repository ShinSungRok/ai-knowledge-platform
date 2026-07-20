import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { HealthController } from "./HealthController";

const CITED_ANSWER_PATH = /^\/workspaces\/[^/]+\/cited-answers$/;

/**
 * Registers health + cited-answer routes against a {@link KnowledgeRuntime}.
 * Controllers depend only on the runtime abstraction. Exact-match routes
 * use {@link DefaultHttpRouter}; the cited-answer path is parametric and
 * is dispatched before exact matching.
 */
export function createKnowledgeHttpRouter(
  runtime: KnowledgeRuntime,
): HttpRouter {
  const health = new HealthController();
  const citedAnswers = new CitedGroundedAnswerController(runtime);
  const exactRouter = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: (request) => health.check(request),
    },
  ]);

  return {
    async handle(request: HttpRequest): Promise<HttpResponse> {
      if (CITED_ANSWER_PATH.test(request.path)) {
        return citedAnswers.create(request);
      }
      return exactRouter.handle(request);
    },
  };
}
