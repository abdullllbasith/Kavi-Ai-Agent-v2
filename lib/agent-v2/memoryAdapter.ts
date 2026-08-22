import type { AgentMemory } from './memory';
import type { MemoryStore } from './memoryStore';

export function createMemoryAdapter(store: MemoryStore, userId: string): AgentMemory {
  return {
    async recall(query: string) {
      const records = await store.get(userId);
      const needle = query.toLowerCase();
      return records.filter((record) => `${record.key} ${record.value}`.toLowerCase().includes(needle));
    },
    async remember(key: string, value: string) {
      const now = new Date().toISOString();
      await store.upsert({
        id: `${userId}:${key}`,
        userId,
        category: 'explicit_preference',
        key,
        value,
        confidence: 1,
        createdAt: now,
        updatedAt: now,
      });
    },
  };
}
