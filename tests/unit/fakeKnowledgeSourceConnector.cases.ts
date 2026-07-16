/**
 * Unit-level cases for FakeKnowledgeSourceConnector.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:connector
 *
 * Covered behaviors:
 * - implements KnowledgeSourceConnector port
 * - fetchDocuments returns only the fixture documents scoped to the exact
 *   (workspaceId, sourceId) of the requested source
 * - fetchDocuments returns an empty array for a source with no fixture,
 *   including a source id only registered in a different workspace
 * - defensive copies on both fixture input (constructor) and fetched
 *   output (fetchDocuments)
 * - rejects invalid source identifiers passed to fetchDocuments
 * - rejects invalid fixture values (workspaceId/sourceId/externalId/title/
 *   text) at construction time
 */
export const FAKE_KNOWLEDGE_SOURCE_CONNECTOR_UNIT_CASES = [
  "implements_KnowledgeSourceConnector_port",
  "returns_fixture_documents_scoped_to_workspace_and_source",
  "unregistered_source_returns_empty_array",
  "defensive_copy_on_fixture_input_and_output",
  "rejects_invalid_source_identifiers",
  "rejects_invalid_fixture_values",
] as const;
