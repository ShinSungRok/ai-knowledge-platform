/**
 * Optional live MCP stdio host entry (Node stdin/stdout).
 * Not part of top-level `pnpm validate` — use Fake streams there.
 *
 * Example:
 *   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm mcp:stdio
 */
import {
  createInMemoryStdioMcpSession,
  createNodeStdioLineReaderWriter,
} from "./createInMemoryStdioMcpSession";

async function main(): Promise<void> {
  const { reader, writer } = createNodeStdioLineReaderWriter();
  const { run } = createInMemoryStdioMcpSession(reader, writer);
  await run();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
