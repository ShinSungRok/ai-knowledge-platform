/**
 * The output of a {@link LanguageModelProvider} generation call: plain
 * generated text, not yet a grounded answer or citation.
 *
 * Deciding whether `text` is sufficiently grounded, structuring it into
 * an answer, and attaching citations are all downstream concerns (later
 * tasks) — `GeneratedText` itself carries none of that.
 */
export interface GeneratedText {
  text: string;
}
