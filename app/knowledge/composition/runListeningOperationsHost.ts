/**
 * Long-running HTTP host for P2 Service Completion Phase A/B.
 *
 *   pnpm start
 *
 * Env defaults: HOST=127.0.0.1 PORT=8080 API_KEY=demo-key
 * API_KEY_SUBJECT=demo-user WORKSPACE_ID=workspace-a
 * STORE: inmemory | postgres | opensearch | postgres+opensearch
 * VECTOR: inmemory | sql | opensearch
 * Fake LLM by default; HTTP LLM when LLM_API_KEY is set.
 * NodeHttpListener (no Express). Demo seed unless SKIP_DEMO_SEED=1.
 */
import {
  createConfiguredListeningHost,
  loadListeningOperationsHostEnv,
} from "./listeningOperationsHostConfig";
import { seedDemoKnowledge } from "./seedDemoKnowledge";

async function main(): Promise<void> {
  const hostEnv = loadListeningOperationsHostEnv();
  const host = await createConfiguredListeningHost(hostEnv);

  console.log(`STORE: ${host.storeMode}`);
  console.log(`VECTOR: ${host.vectorMode}`);
  console.log(`LLM: ${host.llmMode}`);

  if (!host.skipDemoSeed) {
    await seedDemoKnowledge(host.server.composition, host.workspaceId);
    console.log(`Demo knowledge seeded for workspace ${host.workspaceId}`);
  } else {
    console.log("SKIP_DEMO_SEED set; starting without demo seed.");
  }

  const address = await host.server.start();
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
      if (host.server.flushObservability) {
        await host.server.flushObservability();
      }
      await host.server.stop();
      await host.dispose();
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
