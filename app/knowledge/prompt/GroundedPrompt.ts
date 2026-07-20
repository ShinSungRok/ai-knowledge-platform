/**
 * An LLM-independent prompt representation produced from a
 * {@link GroundingContext} by a {@link PromptBuilder}.
 *
 * `systemInstruction` and `userMessage` are plain strings — no message
 * role framework, provider-specific chat format, or template engine.
 * Turning a `GroundedPrompt` into an actual LLM provider request (e.g. a
 * chat-completion message array) is the responsibility of whatever
 * consumes this type, never `PromptBuilder` itself.
 */
export interface GroundedPrompt {
  systemInstruction: string;
  userMessage: string;
}
