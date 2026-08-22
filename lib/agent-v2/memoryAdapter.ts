import type { MemoryStore as AgentMemoryStore, MemoryItem } from './memory';
import type { MemoryStore as PersistentMemoryStore } from './memoryStore';

export function createMemoryAdapter(store: PersistentMemoryStore, userId: string): AgentMemoryStore {
  const toItem = (record: Awaited<ReturnType<PersistentMemoryStore['get']>>[number]): MemoryItem => ({
    id: record.id,
    kind: record.category === 'explicit_preference' ? 'preference' : record.category === 'temporary_context' ? 'interaction' : 'fact',
    key: record.key,
    value: record.value,
    confidence: record.confidence,
    source: record.category === 'inferred_preference' ? 'inferred' : 'user',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

  return {
    async get(key: string) {
      const [record] = await store.get(userId, key);
      return record ? toItem(record) : null;
    },
    async search(query: string, limit = 8) {
      const records = await store.get(userId);
      const needle = query.toLowerCase();
      return records.filter((record) => `${record.key} ${record.value}`.toLowerCase().includes(needle)).sort((a, b) => b.confidence - a.confidence).slice(0, limit).map(toItem);
    },
    async upsert(item: MemoryItem) {
      const now = new Date().toISOString();
      await store.upsert({
        id: `${userId}:${item.key}`,
        userId,
        category: item.kind === 'preference' ? 'explicit_preference' : item.kind === 'task' ? 'temporary_context' : 'inferred_preference',
        key: item.key,
        value: item.value,
        confidence: item.confidence,
        createdAt: item.createdAt || now,
        updatedAt: now,
      });
    },
  };
}
