import type { GroundingContext, GroundingContextBlock } from "../context/GroundingContext";
import type { GeneratedText } from "../ai/GeneratedText";
import type { GroundedAnswerAssembler } from "./GroundedAnswerAssembler";
import type { GroundedAnswerAssemblyInput } from "./GroundedAnswerAssemblyInput";
import type { GroundedAnswer } from "./GroundedAnswer";

/** Returned instead of generated text whenever the given context carried no evidence blocks. */
const INSUFFICIENT_EVIDENCE_MESSAGE =
  "The available knowledge does not contain enough information.";

/**
 * Default {@link GroundedAnswerAssembler} adapter: applies the
 * insufficient-evidence policy deterministically — no framework,
 * repository, provider, or search/context/prompt adapter dependency,
 * and no constructor dependency at all.
 *
 * When `context.blocks` is empty, the given `generatedText` is
 * **discarded** and never returned as an answer: `text` is always the
 * fixed insufficient-evidence message, `evidence` is `[]`, and
 * `insufficientEvidence` is `true`. When `context.blocks` has at least
 * one entry, the answer is `text: generatedText.text` (unchanged),
 * `evidence` is a fresh copy of `context.blocks`, and
 * `insufficientEvidence` is `false` — this holds even when
 * `context.truncated` is `true`; **truncation is never treated as
 * evidence absence** on its own. Neither the input `context`/
 * `generatedText` nor `context.blocks` (or its entries) are mutated;
 * `evidence` is always a fresh array of fresh objects. Input is
 * validated — `context.query`/`content` as strings, `truncated` as a
 * boolean, `blocks` as an array of well-formed `GroundingContextBlock`s,
 * `generatedText.text` as a string — before assembling.
 */
export class DefaultGroundedAnswerAssembler implements GroundedAnswerAssembler {
  async assemble(input: GroundedAnswerAssemblyInput): Promise<GroundedAnswer> {
    const validated = this.toInput(input);

    if (validated.context.blocks.length === 0) {
      return {
        text: INSUFFICIENT_EVIDENCE_MESSAGE,
        evidence: [],
        insufficientEvidence: true,
      };
    }

    return {
      text: validated.generatedText.text,
      evidence: validated.context.blocks.map((block) => ({ ...block })),
      insufficientEvidence: false,
    };
  }

  private toInput(input: GroundedAnswerAssemblyInput): GroundedAnswerAssemblyInput {
    if (!input || typeof input !== "object") {
      throw new Error("GroundedAnswerAssemblyInput must be an object");
    }
    return {
      context: this.toContext(input.context),
      generatedText: this.toGeneratedText(input.generatedText),
    };
  }

  private toContext(context: GroundingContext): GroundingContext {
    if (!context || typeof context !== "object") {
      throw new Error("GroundingContext must be an object");
    }
    if (typeof context.query !== "string") {
      throw new Error("GroundingContext.query must be a string");
    }
    if (typeof context.content !== "string") {
      throw new Error("GroundingContext.content must be a string");
    }
    if (typeof context.truncated !== "boolean") {
      throw new Error("GroundingContext.truncated must be a boolean");
    }
    if (!Array.isArray(context.blocks)) {
      throw new Error("GroundingContext.blocks must be an array");
    }
    for (const block of context.blocks) {
      this.assertBlock(block);
    }
    return {
      query: context.query,
      blocks: context.blocks,
      content: context.content,
      truncated: context.truncated,
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

  private toGeneratedText(generatedText: GeneratedText): GeneratedText {
    if (!generatedText || typeof generatedText !== "object") {
      throw new Error("GeneratedText must be an object");
    }
    if (typeof generatedText.text !== "string") {
      throw new Error("GeneratedText.text must be a string");
    }
    return { text: generatedText.text };
  }
}
