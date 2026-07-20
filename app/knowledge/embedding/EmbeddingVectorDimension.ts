/**
 * Fixed dimension every {@link EmbeddingProvider} in this module must
 * produce, and every vector index entry must accept. A provider and the
 * vector index it feeds never drift because both are validated against
 * this same constant.
 */
export const EMBEDDING_VECTOR_DIMENSION = 8;
