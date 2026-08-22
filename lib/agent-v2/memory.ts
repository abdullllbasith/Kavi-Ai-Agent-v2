export type MemoryKind = 'preference' | 'fact' | 'interaction' | 'task';

export type MemoryItem = {
  id: string;
  kind: MemoryKind;
  key: string;
  value: string;
  confidence: number;
  source: 'user' | 'agent' | 'inferred';
  createdAt: string;
  updatedAt: string;
};

export interface MemoryStore {
  get(key: string): Promise<MemoryItem | null>;
  search(query: string, limit?: number): Promise<MemoryItem[]>;
  upsert(item: MemoryItem): Promise<void>;
}

export class InMemoryAgentMemory implements MemoryStore {
  private readonly items = new Map<string, MemoryItem>();

  async get(key: string): Promise<MemoryItem | null> {
    return this.items.get(key) ?? null;
  }

  async search(query: string, limit = 8): Promise<MemoryItem[]> {
    const q = query.toLowerCase();
    return [...this.items.values()]
      .filter((item) => `${item.key} ${item.value}`.toLowerCase().includes(q))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  async upsert(item: MemoryItem): Promise<void> {
    this.items.set(item.key, item);
  }
}

export function createMemoryItem(kind: MemoryKind, key: string, value: string, source: MemoryItem['source'] = 'user', confidence = 1): MemoryItem {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), kind, key, value, source, confidence, createdAt: now, updatedAt: now };
}
