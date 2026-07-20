import type { GroundingContext, GroundingContextBlock } from "../context/GroundingContext";
import type { PromptBuilder } from "./PromptBuilder";
import type { GroundedPrompt } from "./GroundedPrompt";

/**
 * Fixed system instruction: names the assistant's role and its single
 * hard constraint (grounding-context-only answers), so no prompt
 * template configuration or per-request customization is needed.
 */
const SYSTEM_INSTRUCTION =
  "You are a knowledge assistant. Answer only from the provided grounding context. If the grounding context is empty or insufficient, state that the available knowledge does not contain enough information. Do not invent facts or citations.";

/** Rendered in place of the grounding context section whenever `GroundingContext.content` is empty. */
const NO_CONTEXT_PLACEHOLDER = "[none]";

/**
 * Default {@link PromptBuilder} adapter: renders a fixed-format,
 * evidence-bound prompt from a {@link GroundingContext} — no framework,
 * repository, retrieval/search/context adapter, or LLM provider
 * dependency, and no constructor dependency at all.
 *
 * `systemInstruction` is always the same fixed instruction string.
 * `userMessage` is built as:
 *
 * ```
 * Question:
 * <query>
 *
 * Grounding context status: <complete|truncated>
 *
 * Grounding context:
 * <content|[none]>
 * ```
 *
 * The status is `truncated` whenever `GroundingContext.truncated` is
 * `true`, `complete` otherwise; the grounding context section is
 * exactly `[none]` whenever `GroundingContext.content` is empty, and the
 * verbatim `content` otherwise — never re-derived from `blocks`, so the
 * prompt never contains evidence outside what `ContextAssembler` already
 * assembled. The input `GroundingContext` (and its `blocks` array/objects)
 * is never mutated. Input is validated — `query`/`content` as strings,
 * `truncated` as a boolean, `blocks` as an array of well-formed
 * `GroundingContextBlock`s — before rendering.
 */
export class DefaultPromptBuilder implements PromptBuilder {
  async build(context: GroundingContext): Promise<GroundedPrompt> {
    const validated = this.toContext(context);

    const status = validated.truncated ? "truncated" : "complete";
    const contextSection =
      validated.content.length === 0 ? NO_CONTEXT_PLACEHOLDER : validated.content;

    const userMessage = `Question:\n${validated.query}\n\nGrounding context status: ${status}\n\nGrounding context:\n${contextSection}`;

    return {
      systemInstruction: SYSTEM_INSTRUCTION,
      userMessage,
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
}
