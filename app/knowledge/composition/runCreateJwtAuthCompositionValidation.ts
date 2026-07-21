import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { JWT_CLAIM_WORKSPACE_ID } from "../security/JwtClaims";
import { signHs256Jwt } from "../security/Hs256JwtVerifier";
import { createOperationsKnowledgeServer } from "./createOperationsKnowledgeServer";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

const WORKSPACE_A = "workspace-a";
const JWT_SECRET = "composition-jwt-secret";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function makeJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  return signHs256Jwt(
    {
      sub: "jwt-user",
      [JWT_CLAIM_WORKSPACE_ID]: WORKSPACE_A,
      exp: now + 3600,
      nbf: now - 60,
    },
    JWT_SECRET,
  );
}

async function seed(
  composition: ReturnType<typeof createOperationsKnowledgeServer>["composition"],
): Promise<void> {
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "document text",
  };
  await composition.knowledgeDocumentRepository.save(document);
  const chunk: DocumentChunk = {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: document.id,
    text: "aaaaaaaa",
    order: 0,
  };
  await composition.documentChunkRepository.replaceForDocument(
    WORKSPACE_A,
    document.id,
    [chunk],
  );
  const embeddingProvider = new FakeEmbeddingProvider();
  const vector = await embeddingProvider.embed(chunk.text);
  await composition.vectorIndex.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: chunk.id,
    vector,
  });
}

async function assertJwtCitedAnswerSmoke(): Promise<void> {
  console.log(
    "[composition] createOperationsKnowledgeServer JWT auth cited-answer smoke...",
  );
  const token = makeJwt();
  const { server, composition } = createOperationsKnowledgeServer({
    auth: {
      type: "jwt",
      config: { type: "hs256", secret: JWT_SECRET },
    },
  });
  await seed(composition);
  await server.start();

  const unauthorized = await server.dispatch({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: { query: "aaaaaaaa" },
  });
  assertEqual(unauthorized.status, 401, "401 without bearer");

  const authorized = await server.dispatch({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: { Authorization: `Bearer ${token}` },
    body: { query: "aaaaaaaa", retrievalLimit: 5, maxCharacters: 10_000 },
  });
  assertEqual(authorized.status, 200, "200 with jwt bearer");

  await server.stop();
}

async function main(): Promise<void> {
  assertEqual(
    KNOWLEDGE_MODULE_COMPOSITION,
    "app/knowledge/composition",
    "module constant",
  );
  await assertJwtCitedAnswerSmoke();
  console.log("JWT auth composition validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
