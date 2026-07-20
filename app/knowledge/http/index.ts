/**
 * Module: `app/knowledge/http`
 *
 * Framework-independent HTTP abstraction: method/request/response types,
 * `HttpHandler` / `HttpRouter` ports, `DefaultHttpRouter` (exact
 * method+path match; JSON 404 on miss), and `ObservingHttpRouter`
 * (logger/metrics decorator). No Express/Fastify/node:http listen.
 */
export const KNOWLEDGE_MODULE_HTTP = "app/knowledge/http" as const;

export type { HttpMethod } from "./HttpMethod";
export type { HttpRequest } from "./HttpRequest";
export type { HttpResponse } from "./HttpResponse";
export type { HttpHandler } from "./HttpHandler";
export type { HttpRouter } from "./HttpRouter";
export type { HttpRoute } from "./DefaultHttpRouter";
export { DefaultHttpRouter } from "./DefaultHttpRouter";
export { ObservingHttpRouter } from "./ObservingHttpRouter";
