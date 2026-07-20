/**
 * Internal `search` module utility: splits text into maximal runs of
 * Unicode letters/numbers, lowercased — the shared token unit used by
 * both {@link DefaultKeywordSearch}'s lexical ranking and
 * {@link DefaultReranker}'s relevance scoring, so both compute "does this
 * text contain this word" the same way.
 *
 * Not part of any public port — this is a plain function, not an
 * adapter, and is not exported from the module barrel.
 */
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function tokenize(text: string): string[] {
  const matches = text.match(TOKEN_PATTERN);
  if (!matches) {
    return [];
  }
  return matches.map((token) => token.toLowerCase());
}
