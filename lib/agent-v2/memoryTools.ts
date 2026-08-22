import type { AgentState, ToolDefinition } from './types';
import type { MemoryStore } from './memory';
import type { KnowledgeRetriever } from './knowledge';
import { createMemoryItem } from './memory';

export function createRecallMemoryTool(memory: MemoryStore): ToolDefinition {
  return {
    name: 'recall_memory',
    description: 'Retrieve relevant user/task memory before making a personalized decision.',
    async execute(input) {
      const query = (input as { query?: string })?.query?.trim();
      if (!query) throw new Error('Memory query is required.');
      return memory.search(query, 8);
    },
  };
}

export function createRememberTool(memory: MemoryStore): ToolDefinition {
  return {
    name: 'remember',
    description: 'Persist a useful user preference or task fact for future agent decisions.',
    async execute(input) {
      const data = input as { kind?: 'preference' | 'fact' | 'interaction' | 'task'; key?: string; value?: string; confidence?: number };
      if (!data.kind || !data.key || !data.value) throw new Error('Memory kind, key and value are required.');
      const item = createMemoryItem(data.kind, data.key, data.value, 'agent', data.confidence ?? 0.8);
      await memory.upsert(item);
      return item;
    },
  };
}

export function createKnowledgeSearchTool(retriever: KnowledgeRetriever): ToolDefinition {
  return {
    name: 'search_knowledge',
    description: 'Retrieve grounded knowledge when product data alone cannot answer the goal.',
    async execute(input, _state: AgentState) {
      const query = (input as { query?: string })?.query?.trim();
      if (!query) throw new Error('Knowledge query is required.');
      return retriever.search(query, 6);
    },
  };
}
