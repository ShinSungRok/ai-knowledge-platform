import type { HttpListenAddress } from "./HttpListenAddress";
import type { HttpListenConfig } from "./HttpListenConfig";

/**
 * TCP listen adapter in front of an {@link HttpRouter}.
 *
 * Separate from {@link KnowledgeServer}, which remains an in-process
 * dispatch lifecycle. Concrete adapters (Fake, later `node:http`) bind
 * sockets and translate HTTP messages to/from the framework-independent
 * request/response types.
 */
export interface HttpListener {
  listen(config: HttpListenConfig): Promise<HttpListenAddress>;
  close(): Promise<void>;
  isListening(): boolean;
}
