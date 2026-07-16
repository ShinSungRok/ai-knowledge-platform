import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

/**
 * Input for registering a knowledge source.
 * Kept separate from the persisted domain type so the use case owns the
 * create contract (validation + normalization) at the application boundary.
 * `workspaceId` scopes both the duplicate-id check and the write to a single
 * workspace — the same `id` may exist independently in another workspace.
 */
export interface CreateKnowledgeSourceInput {
  workspaceId: string;
  id: string;
  name: string;
}

/**
 * Create use case: register a knowledge source through the repository port.
 *
 * Depends only on {@link KnowledgeSourceRepository} — never on a concrete
 * adapter. Composition (or validation) injects the adapter.
 */
export class CreateKnowledgeSourceUseCase {
  constructor(
    private readonly knowledgeSourceRepository: KnowledgeSourceRepository,
  ) {}

  async execute(input: CreateKnowledgeSourceInput): Promise<KnowledgeSource> {
    const source = this.toSource(input);

    const existing = await this.knowledgeSourceRepository.findById(
      source.workspaceId,
      source.id,
    );
    if (existing) {
      throw new Error(`KnowledgeSource already exists: ${source.id}`);
    }

    await this.knowledgeSourceRepository.save(source);
    return source;
  }

  private toSource(input: CreateKnowledgeSourceInput): KnowledgeSource {
    if (!input || typeof input !== "object") {
      throw new Error("CreateKnowledgeSourceInput must be an object");
    }

    const workspaceId = this.requireNonEmptyString(
      input.workspaceId,
      "workspaceId",
    );
    const id = this.requireNonEmptyString(input.id, "id");
    const name = this.requireNonEmptyString(input.name, "name");

    return { workspaceId, id, name };
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `CreateKnowledgeSourceInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }
}
