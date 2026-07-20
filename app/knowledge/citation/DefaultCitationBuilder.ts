import type { GroundingContextBlock } from "../context/GroundingContext";
import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { Citation } from "./Citation";
import type { CitationBuilder } from "./CitationBuilder";

/**
 * Default {@link CitationBuilder} adapter: applies the evidence-only
 * citation policy deterministically — no framework, repository,
 * provider, or search/context/prompt adapter dependency, and no
 * constructor dependency at all.
 *
 * Walks `answer.evidence` in the given order (never re-sorts) and emits
 * exactly one {@link Citation} per block. `Citation.id` is
 * `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`;
 * `sourceId`/`documentId`/`chunkId`/`score` are copied from the block;
 * `excerpt` is the block's own `text`, never truncated. An empty
 * evidence list yields an empty `Citation[]` — never a fabricated
 * citation. Neither the input answer nor its evidence array/entries
 * are mutated; every returned citation is a fresh object. Input is
 * validated — `answer.text` a string, `insufficientEvidence` a boolean,
 * `evidence` an array of well-formed `GroundingContextBlock`s — before
 * building.
 */
export class DefaultCitationBuilder implements CitationBuilder {
  async build(answer: GroundedAnswer): Promise<Citation[]> {
    const validated = this.toAnswer(answer);

    return validated.evidence.map((block) => this.toCitation(block));
  }

  private toAnswer(answer: GroundedAnswer): GroundedAnswer {
    if (!answer || typeof answer !== "object") {
      throw new Error("GroundedAnswer must be an object");
    }
    if (typeof answer.text !== "string") {
      throw new Error("GroundedAnswer.text must be a string");
    }
    if (typeof answer.insufficientEvidence !== "boolean") {
      throw new Error("GroundedAnswer.insufficientEvidence must be a boolean");
    }
    if (!Array.isArray(answer.evidence)) {
      throw new Error("GroundedAnswer.evidence must be an array");
    }
    for (const block of answer.evidence) {
      this.assertBlock(block);
    }
    return {
      text: answer.text,
      evidence: answer.evidence,
      insufficientEvidence: answer.insufficientEvidence,
    };
  }

  private assertBlock(block: GroundingContextBlock): void {
    if (!block || typeof block !== "object") {
      throw new Error("GroundingContextBlock must be an object");
    }
    this.assertNonEmptyString(block.sourceId, "sourceId");
    this.assertNonEmptyString(block.documentId, "documentId");
    this.assertNonEmptyString(block.chunkId, "chunkId");
    if (typeof block.score !== "number" || !Number.isFinite(block.score)) {
      throw new Error("GroundingContextBlock.score must be a finite number");
    }
    if (typeof block.text !== "string") {
      throw new Error("GroundingContextBlock.text must be a string");
    }
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`GroundingContextBlock.${field} must be a non-empty string`);
    }
  }

  private toCitation(block: GroundingContextBlock): Citation {
    return {
      id: `cite:${encodeURIComponent(block.sourceId)}:${encodeURIComponent(block.documentId)}:${encodeURIComponent(block.chunkId)}`,
      sourceId: block.sourceId,
      documentId: block.documentId,
      chunkId: block.chunkId,
      score: block.score,
      excerpt: block.text,
    };
  }
}
