import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import type { McpStdioLineReader } from "../mcp/McpStdioLineReader";
import type { McpStdioLineWriter } from "../mcp/McpStdioLineWriter";
import type { McpStdioSessionConfig } from "../mcp/McpStdioSessionConfig";
import {
  NodeMcpStdioLineReader,
  NodeMcpStdioLineWriter,
} from "../mcp/NodeMcpStdioLines";
import { StdioMcpJsonRpcSession } from "../mcp/StdioMcpJsonRpcSession";
import {
  createInMemoryKnowledgeComposition,
  type CreateInMemoryKnowledgeCompositionOptions,
} from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

export type CreateStdioMcpSessionOptions = {
  config?: KnowledgeRuntimeConfig;
  llm?: CreateInMemoryKnowledgeCompositionOptions["llm"];
  session?: McpStdioSessionConfig;
};

/**
 * Builds an in-memory MCP stdio session that reuses the same registry/handler
 * as HTTP `/mcp`. Reader/writer are injected (Fake in validate; Node stdio
 * via {@link createNodeStdioLineReaderWriter}). No Bearer AuthN on stdio.
 */
export function createInMemoryStdioMcpSession(
  reader: McpStdioLineReader,
  writer: McpStdioLineWriter,
  options: CreateStdioMcpSessionOptions = {},
): {
  composition: InMemoryKnowledgeComposition;
  session: StdioMcpJsonRpcSession;
  run(): Promise<void>;
} {
  const composition = createInMemoryKnowledgeComposition(options.config, {
    llm: options.llm,
  });
  const session = new StdioMcpJsonRpcSession(
    composition.mcpJsonRpcHandler,
    reader,
    writer,
    options.session,
  );
  return {
    composition,
    session,
    run: () => session.run(),
  };
}

/**
 * Optional Node `process.stdin` / `process.stdout` adapters for local MCP
 * host use. Not used by default `pnpm validate`.
 */
export function createNodeStdioLineReaderWriter(
  stdin: NodeJS.ReadableStream = process.stdin,
  stdout: NodeJS.WritableStream = process.stdout,
): {
  reader: McpStdioLineReader;
  writer: McpStdioLineWriter;
} {
  return {
    reader: new NodeMcpStdioLineReader(stdin as import("node:stream").Readable),
    writer: new NodeMcpStdioLineWriter(stdout as import("node:stream").Writable),
  };
}
