/**
 * Optional live LLM HTTP smoke. Skips (exit 0) when LLM_API_KEY is unset.
 * Not included in top-level `pnpm validate`.
 *
 * Env:
 * - `LLM_API_KEY` (required for live run)
 * - `LLM_BASE_URL` (default `https://api.openai.com/v1`)
 * - `LLM_MODEL` (default `gpt-4o-mini`)
 */
import { FetchLlmHttpTransport } from "./FetchLlmHttpTransport";
import { HttpLanguageModelProvider } from "./HttpLanguageModelProvider";

async function main(): Promise<void> {
  const apiKey = process.env["LLM_API_KEY"];
  if (apiKey === undefined || apiKey.trim().length === 0) {
    console.log(
      "[ai] LLM_API_KEY unset — skipping live HttpLanguageModelProvider smoke.",
    );
    return;
  }

  const baseUrl =
    process.env["LLM_BASE_URL"]?.trim() || "https://api.openai.com/v1";
  const model = process.env["LLM_MODEL"]?.trim() || "gpt-4o-mini";

  console.log("[ai] Running live HttpLanguageModelProvider smoke...");
  const provider = new HttpLanguageModelProvider(
    { baseUrl, apiKey, model },
    new FetchLlmHttpTransport(),
  );
  const result = await provider.generate({
    systemInstruction: "Reply with exactly: ok",
    userMessage: "ping",
  });
  if (typeof result.text !== "string" || result.text.trim().length === 0) {
    throw new Error("live LLM returned empty text");
  }
  console.log("HttpLanguageModelProvider live validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
