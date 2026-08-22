export type KnowledgeChunk = {
  id: string;
  text: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export interface VectorIndex {
  upsert(chunks: KnowledgeChunk[], vectors: number[][]): Promise<void>;
  search(vector: number[], limit: number): Promise<KnowledgeChunk[]>;
}

export interface KnowledgeBase {
  search(query: string, limit?: number): Promise<KnowledgeChunk[]>;
}

export class RetrievalKnowledgeBase implements KnowledgeBase {
  constructor(private readonly embedder: EmbeddingProvider, private readonly index: VectorIndex) {}
  async search(query: string, limit = 5): Promise<KnowledgeChunk[]> {
    const [vector] = await this.embedder.embed([query]);
    if (!vector?.length) return [];
    return this.index.search(vector, limit);
  }
}

export function buildGroundedContext(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return 'No knowledge sources were retrieved. Do not invent knowledge-base facts.';
  return chunks.map((chunk, index) => `[${index + 1}] ${chunk.text}\nSource: ${chunk.source}`).join('\n\n');
}
