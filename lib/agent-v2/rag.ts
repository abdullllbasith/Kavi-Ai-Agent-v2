export type KnowledgeChunk = { id: string; text: string; source: string; score: number; metadata?: Record<string, unknown> };
export interface EmbeddingProvider { embed(texts: string[]): Promise<number[][]>; }
export interface VectorIndex { upsert(chunks: KnowledgeChunk[], vectors: number[][]): Promise<void>; search(vector: number[], limit: number): Promise<KnowledgeChunk[]>; }
export interface KnowledgeBase { search(query: string, limit?: number): Promise<KnowledgeChunk[]>; }

const MAX_QUERY_LENGTH = 4000;
const MAX_RESULTS = 20;

export class RetrievalKnowledgeBase implements KnowledgeBase {
  constructor(private readonly embedder: EmbeddingProvider, private readonly index: VectorIndex) {}
  async search(query: string, limit = 5): Promise<KnowledgeChunk[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    if (normalized.length > MAX_QUERY_LENGTH) throw new Error('Knowledge query is too long.');
    const safeLimit = Math.max(1, Math.min(MAX_RESULTS, Math.floor(limit)));
    const [vector] = await this.embedder.embed([normalized]);
    if (!vector?.length || vector.some((value) => !Number.isFinite(value))) return [];
    const chunks = await this.index.search(vector, safeLimit);
    return chunks.filter((chunk) => chunk && typeof chunk.text === 'string' && chunk.text.trim() && typeof chunk.source === 'string' && Number.isFinite(chunk.score));
  }
}

export function buildGroundedContext(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return 'No knowledge sources were retrieved. Do not invent knowledge-base facts.';
  return chunks.map((chunk, index) => `[${index + 1}] ${chunk.text}\nSource: ${chunk.source}`).join('\n\n');
}
