/**
 * Module: `app/knowledge/server`
 *
 * Production server runtime and lifecycle.
 *
 * `KnowledgeServer` / `DefaultKnowledgeServer` provide in-process
 * start/stop/dispatch over an injected {@link HttpRouter} (no TCP bind).
 * `HttpListener` is a separate TCP listen adapter contract in front of a
 * router; concrete `node:http` wiring comes in a later task.
 */
export const KNOWLEDGE_MODULE_SERVER = "app/knowledge/server" as const;

export type { KnowledgeServer } from "./KnowledgeServer";
export { DefaultKnowledgeServer } from "./DefaultKnowledgeServer";
export type { HttpListenConfig } from "./HttpListenConfig";
export type { HttpListenAddress } from "./HttpListenAddress";
export type { HttpListener } from "./HttpListener";
