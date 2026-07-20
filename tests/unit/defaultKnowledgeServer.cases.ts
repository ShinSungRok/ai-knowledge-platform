/**
 * Unit-level cases for `DefaultKnowledgeServer` lifecycle and dispatch.
 *
 * Executed via:
 *
 *   pnpm validate:server:lifecycle
 */
export const DEFAULT_KNOWLEDGE_SERVER_UNIT_CASES = [
  "module_constant",
  "start_stop_lifecycle",
  "dispatch_before_start_rejected",
  "health_and_cited_answer_dispatch",
  "no_network_listen",
  "depends_only_on_http_router",
] as const;
