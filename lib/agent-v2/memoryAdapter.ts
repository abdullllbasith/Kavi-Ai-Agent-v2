import type { MemoryStore as AgentMemoryStore, MemoryItem } from './memory';
import type { MemoryStore as PersistentMemoryStore, MemoryRecord } from './memoryStore';

const MAX_SEARCH_LIMIT = 50;

export function createMemoryAdapter(store: PersistentMemoryStore, userId: string): AgentMemoryStore {
  if (!userId.trim()) throw new Error('userId is required for memory access.');

  const toItem = (record: MemoryRecord): MemoryItem => ({
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
      const safeLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
      const records = await store.get(userId);
      const needle = query.trim().toLowerCase();
      return records
        .filter((record) => !needle || `${record.key} ${record.value}`.toLowerCase().includes(needle))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, safeLimit)
        .map(toItem);
    },
    async upsert(item: MemoryItem) {
      const now = new Date().toISOString();
      const existing = await store.get(userId, item.key);
      const createdAt = existing[0]?.createdAt ?? item.createdAt ?? now;
      await store.upsert({
        id: existing[0]?.id ?? `${userId}:${item.key}`,
        userId,
        category: item.kind === 'preference' ? 'explicit_preference' : item.kind === 'task' ? 'temporary_context' : 'inferred_preference',
        key: item.key,
        value: item.value,
        confidence: Math.max(0, Math.min(1, item.confidence)),
        createdAt,
        updatedAt: now,
        expiresAt: existing[0]?.expiresAt,
      });
    },
  };
}
