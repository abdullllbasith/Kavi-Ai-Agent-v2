import { runKaviV2 } from '../lib/agent-v2/orchestrator.js';
import { InMemoryMemoryStore } from '../lib/agent-v2/memoryStore.js';

const llm = async <T>(input: { system: string; user: string; schema: string }): Promise<T> => {
  if (input.system.toLowerCase().includes('evaluator')) {
    return { success: true, score: 1, reason: 'mock evidence sufficient' } as T;
  }
  return { kind: 'complete', reason: 'mock complete' } as T;
};

const result = await runKaviV2('hello', { userId: 'user-1', llm, memory: new InMemoryMemoryStore() });
if (result.userId !== 'user-1') throw new Error('User identity was not preserved.');
if (result.state.status !== 'completed') throw new Error('Orchestrator did not complete mock run.');
