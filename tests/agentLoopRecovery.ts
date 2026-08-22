import { runAgentLoop } from '../lib/agent-v2/agentLoop.js';
import { ToolRegistry } from '../lib/agent-v2/toolRegistry.js';
import type { AgentState } from '../lib/agent-v2/types.js';

const base: AgentState = {
  turnId: 'recovery', status: 'planning', userMessage: 'do task', goal: 'task', constraints: {}, plan: [], observations: [], actions: [], iteration: 0, maxIterations: 3,
};

const registry = new ToolRegistry();
let calls = 0;
registry.register({ name: 'unstable', description: 'temporary test tool', execute: async () => { calls += 1; if (calls === 1) throw new Error('temporary timeout'); return { ok: true }; } });
const recovered = await runAgentLoop(base, registry, {
  plan: async () => ({ kind: 'act', tool: 'unstable', reason: 'test', input: {} }),
  evaluate: async () => ({ kind: 'complete', reason: 'verified' }),
});
if (calls !== 2 || recovered.status !== 'completed') throw new Error('Transient failure was not recovered.');

const denied = new ToolRegistry();
denied.register({ name: 'protected', description: 'protected test tool', execute: async () => ({ ok: true }) }, { requiresConfirmation: true });
const blocked = await runAgentLoop(base, denied, {
  plan: async () => ({ kind: 'act', tool: 'protected', reason: 'test', input: {} }),
  evaluate: async () => ({ kind: 'complete', reason: 'should not run' }),
});
if (blocked.status !== 'waiting_for_user') throw new Error('Authorization failure did not stop for user.');
