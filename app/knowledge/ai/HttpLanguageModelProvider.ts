import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { GeneratedText } from "./GeneratedText";
import type { LanguageModelProvider } from "./LanguageModelProvider";
import type { LlmHttpProviderConfig } from "./LlmHttpProviderConfig";
import type { LlmHttpTransport } from "./LlmHttpTransport";

/**
 * OpenAI-compatible {@link LanguageModelProvider} over {@link LlmHttpTransport}.
 *
 * Does not rewrite prompts, call SDKs, or perform network I/O itself —
 * all HTTP goes through the injected transport.
 */
export class HttpLanguageModelProvider implements LanguageModelProvider {
  constructor(
    private readonly config: LlmHttpProviderConfig,
    private readonly transport: LlmHttpTransport,
  ) {}

  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    const validated = this.toPrompt(prompt);
    const baseUrl = this.config.baseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;
    const body = JSON.stringify({
      model: this.config.model,
      messages: [
        { role: "system", content: validated.systemInstruction },
        { role: "user", content: validated.userMessage },
      ],
      ...(this.config.temperature !== undefined
        ? { temperature: this.config.temperature }
        : {}),
    });

    const response = await this.transport.fetch({
      url,
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      body,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`LLM HTTP request failed: ${response.status}`);
    }

    return { text: this.extractContent(response.bodyText) };
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

  private extractContent(bodyText: string): string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      throw new Error("LLM HTTP response is invalid");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("LLM HTTP response is invalid");
    }
    const choices = (parsed as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("LLM HTTP response is invalid");
    }
    const first = choices[0];
    if (!first || typeof first !== "object" || Array.isArray(first)) {
      throw new Error("LLM HTTP response is invalid");
    }
    const message = (first as { message?: unknown }).message;
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      throw new Error("LLM HTTP response is invalid");
    }
    const content = (message as { content?: unknown }).content;
    if (typeof content !== "string") {
      throw new Error("LLM HTTP response is invalid");
    }
    return content;
  }
}
