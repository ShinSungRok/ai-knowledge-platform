import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { HealthController } from "./HealthController";

const CITED_ANSWER_PATH = /^\/workspaces\/[^/]+\/cited-answers$/;

/**
 * Registers health + cited-answer routes against a {@link KnowledgeRuntime}.
 * Cited-answer requires Bearer AuthN then workspace AuthZ.
 * Health does not require authentication.
 */
export function createKnowledgeHttpRouter(
  runtime: KnowledgeRuntime,
  bearerGuard: HttpBearerGuard,
  workspaceAuthorizer: WorkspaceAuthorizer,
): HttpRouter {
  const health = new HealthController();
  const citedAnswers = new CitedGroundedAnswerController(
    runtime,
    bearerGuard,
    workspaceAuthorizer,
  );
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
