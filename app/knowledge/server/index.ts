/**
 * Module: `app/knowledge/server`
 *
 * Production server runtime and lifecycle without network listen.
 *
 * `KnowledgeServer` exposes start/stop/isRunning/dispatch.
 * `DefaultKnowledgeServer` depends only on {@link HttpRouter} and
 * dispatches in-process — no TCP bind.
 */
export const KNOWLEDGE_MODULE_SERVER = "app/knowledge/server" as const;

export type { KnowledgeServer } from "./KnowledgeServer";
export { DefaultKnowledgeServer } from "./DefaultKnowledgeServer";
