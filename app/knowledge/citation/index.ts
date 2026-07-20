/**
 * Module: `app/knowledge/citation`
 *
 * Citation building from grounded-answer evidence.
 *
 * `Citation` (Task 47) is a deterministic, evidence-bound citation
 * (`id`, `sourceId`, `documentId`, `chunkId`, `score`, `excerpt`);
 * `CitedGroundedAnswer` pairs a `GroundedAnswer` with its
 * `Citation[]`; the `CitationBuilder` port
 * (`build(answer): Promise<Citation[]>`) is where the evidence-only
 * citation policy lives — never fabricating a citation outside
 * `answer.evidence`. `DefaultCitationBuilder` (Task 48) is its default
 * adapter: no constructor dependency at all, emitting exactly one
 * citation per evidence block in order (empty evidence → empty list).
 */
export const KNOWLEDGE_MODULE_CITATION = "app/knowledge/citation" as const;

export type { Citation } from "./Citation";
export type { CitedGroundedAnswer } from "./CitedGroundedAnswer";
export type { CitationBuilder } from "./CitationBuilder";
export { DefaultCitationBuilder } from "./DefaultCitationBuilder";
