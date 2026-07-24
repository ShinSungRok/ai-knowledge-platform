/**
 * Narrow port so a workflow researcher step can call P2 knowledge serving
 * without importing composition or concrete RAG adapters.
 *
 * Wired in composition/validation to {@link KnowledgeRuntime} /
 * GenerateCitedGroundedAnswerUseCase.
 */
export interface WorkflowKnowledgeAnswerPort {
  answer(input: {
    workspaceId: string;
    query: string;
  }): Promise<{
    answerText: string;
    citationCount: number;
    insufficientEvidence: boolean;
  }>;
}
