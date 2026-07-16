/**
 * Application module: use-case orchestration over domain types and ports.
 */
export const KNOWLEDGE_MODULE_APPLICATION = "app/knowledge/application" as const;

export { ListKnowledgeDocumentsUseCase } from "./ListKnowledgeDocumentsUseCase";
export {
  CreateKnowledgeDocumentUseCase,
  type CreateKnowledgeDocumentInput,
} from "./CreateKnowledgeDocumentUseCase";
