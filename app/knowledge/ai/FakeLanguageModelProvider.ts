import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { LanguageModelProvider } from "./LanguageModelProvider";
import type { GeneratedText } from "./GeneratedText";

/**
 * Deterministic {@link LanguageModelProvider} adapter for validating the
 * contract and downstream application flow without network, an API key,
 * or a model SDK — no external dependency at all.
 *
 * `generate` validates the given {@link GroundedPrompt} (`systemInstruction`
 * as a non-empty string, `userMessage` as a string) and echoes
 * `userMessage` back as `GeneratedText.text`, unchanged. It never
 * constructs, rewrites, or re-derives a prompt of its own, and never
 * calls out to a retrieval/search/context/prompt-builder adapter — it
 * only consumes the `GroundedPrompt` it is given. Neither the input
 * prompt nor its fields are mutated; the returned `GeneratedText` is
 * always a fresh object.
 */
export class FakeLanguageModelProvider implements LanguageModelProvider {
  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    const validated = this.toPrompt(prompt);
    return { text: validated.userMessage };
  }

  private toPrompt(prompt: GroundedPrompt): GroundedPrompt {
    if (!prompt || typeof prompt !== "object") {
      throw new Error("GroundedPrompt must be an object");
    }
    if (
      typeof prompt.systemInstruction !== "string" ||
      prompt.systemInstruction.trim().length === 0
    ) {
      throw new Error("GroundedPrompt.systemInstruction must be a non-empty string");
    }
    if (typeof prompt.userMessage !== "string") {
      throw new Error("GroundedPrompt.userMessage must be a string");
    }
    return {
      systemInstruction: prompt.systemInstruction,
      userMessage: prompt.userMessage,
    };
  }
}
