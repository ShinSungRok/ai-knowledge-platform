/**
 * Long-running HTTP host for P2 Service Completion Phase A.
 *
 *   pnpm start
 *
 * Env defaults: HOST=127.0.0.1 PORT=8080 API_KEY=demo-key
 * API_KEY_SUBJECT=demo-user WORKSPACE_ID=workspace-a
 * Fake LLM; InMemory composition; NodeHttpListener (no Express).
 * Demo seed is wired in Task 221 (`SKIP_DEMO_SEED=1` to skip).
 */
import {
  createConfiguredListeningOperationsServer,
  loadListeningOperationsHostEnv,
} from "./listeningOperationsHostConfig";
import { seedDemoKnowledge } from "./seedDemoKnowledge";

async function main(): Promise<void> {
  const hostEnv = loadListeningOperationsHostEnv();
  const server = createConfiguredListeningOperationsServer(hostEnv);

  if (!hostEnv.skipDemoSeed) {
    await seedDemoKnowledge(server.composition, hostEnv.workspaceId);
    console.log(`Demo knowledge seeded for workspace ${hostEnv.workspaceId}`);
  } else {
    console.log("SKIP_DEMO_SEED set; starting without demo seed.");
  }

  const address = await server.start();
  console.log(
    `Listening operations host bound at http://${address.host}:${address.port}`,
  );

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    console.log(`Received ${signal}; stopping...`);
    try {
      if (server.flushObservability) {
        await server.flushObservability();
      }
      await server.stop();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
