export type KnowledgeChunk = {
  id: string;
  text: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface KnowledgeRetriever {
  search(query: string, limit?: number): Promise<KnowledgeChunk[]>;
}

export class EmptyKnowledgeRetriever implements KnowledgeRetriever {
  async search(_query: string, _limit = 5): Promise<KnowledgeChunk[]> {
    return [];
  }
}

export function buildKnowledgeContext(chunks: KnowledgeChunk[], maxChars = 6000): string {
  return chunks.reduce((text, chunk) => {
    const addition = `\n[${chunk.source}] ${chunk.text}`;
    return text.length + addition.length <= maxChars ? text + addition : text;
  }, '').trim();
}
