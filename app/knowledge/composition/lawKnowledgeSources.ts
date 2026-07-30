import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { LawGoKrSourceMapping } from "../pipeline/LawGoKrKnowledgeSourceConnector";

/**
 * Fixed MVP set of 국가법령정보센터(law.go.kr) laws seeded as demo knowledge:
 * one security/network-adjacent law (개인정보 보호법, 정보통신망법) alongside
 * 근로기준법 for topical variety across an unrelated domain. `mst` is each
 * law's 법령일련번호, resolved once via `lawSearch.do` and pinned here so the
 * one-off snapshot fetch (`runFetchLawKnowledgeSnapshot.ts`) never needs a
 * live search call.
 */
export const LAW_KNOWLEDGE_WORKSPACE_ID = "workspace-a";

export const LAW_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    workspaceId: LAW_KNOWLEDGE_WORKSPACE_ID,
    id: "law-privacy-protection-act",
    name: "개인정보 보호법",
  },
  {
    workspaceId: LAW_KNOWLEDGE_WORKSPACE_ID,
    id: "law-labor-standards-act",
    name: "근로기준법",
  },
  {
    workspaceId: LAW_KNOWLEDGE_WORKSPACE_ID,
    id: "law-network-act",
    name: "정보통신망 이용촉진 및 정보보호 등에 관한 법률",
  },
];

export const LAW_KNOWLEDGE_SOURCE_MAPPINGS: LawGoKrSourceMapping[] = [
  { sourceId: "law-privacy-protection-act", mst: "270351" },
  { sourceId: "law-labor-standards-act", mst: "265959" },
  { sourceId: "law-network-act", mst: "282481" },
];
