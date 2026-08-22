export type MemoryCategory = 'explicit_preference' | 'temporary_context' | 'inferred_preference';

export type MemoryRecord = {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

export interface MemoryStore {
  get(userId: string, key?: string): Promise<MemoryRecord[]>;
  upsert(record: MemoryRecord): Promise<void>;
  delete(userId: string, id: string): Promise<void>;
}

export class InMemoryMemoryStore implements MemoryStore {
  private readonly records = new Map<string, MemoryRecord>();
  async get(userId: string, key?: string): Promise<MemoryRecord[]> {
    const now = Date.now();
    return [...this.records.values()].filter((r) => r.userId === userId && (!key || r.key === key) && (!r.expiresAt || Date.parse(r.expiresAt) > now));
  }
  async upsert(record: MemoryRecord): Promise<void> { this.records.set(record.id, record); }
  async delete(userId: string, id: string): Promise<void> {
    const record = this.records.get(id);
    if (record?.userId === userId) this.records.delete(id);
  }
}
