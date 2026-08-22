import type { KnowledgeRetriever, KnowledgeChunk } from './knowledge';
import type { KnowledgeBase } from './rag';

export function createKnowledgeRetrieverAdapter(base: KnowledgeBase): KnowledgeRetriever {
  return {
    async search(query: string, limit = 5): Promise<KnowledgeChunk[]> {
      return base.search(query, limit);
    },
  };
}
