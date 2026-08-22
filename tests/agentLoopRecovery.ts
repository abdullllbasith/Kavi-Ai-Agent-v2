import { runAgentLoop } from '../lib/agent-v2/agentLoop.js';
import { ToolRegistry } from '../lib/agent-v2/toolRegistry.js';
import type { AgentState } from '../lib/agent-v2/types.js';

const base: AgentState = { turnId: 'recovery', status: 'planning', userMessage: 'do task', goal: 'task', constraints: {}, plan: [], observations: [], actions: [], iteration: 0, maxIterations: 4 };

const registry = new ToolRegistry();
let calls = 0;
registry.register({ name: 'unstable', description: 'temporary test tool', execute: async () => { calls += 1; if (calls <= 2) throw new Error('temporary timeout'); return { ok: true }; } });
const recovered = await runAgentLoop(base, registry, { plan: async () => ({ kind: 'act', tool: 'unstable', reason: 'test', input: {} }), evaluate: async () => ({ kind: 'complete', reason: 'verified' }) });
if (calls !== 2 || recovered.status !== 'failed') throw new Error('Retry budget did not stop repeated transient failures.');

const successRegistry = new ToolRegistry();
let successCalls = 0;
successRegistry.register({ name: 'unstable_once', description: 'temporary test tool', execute: async () => { successCalls += 1; if (successCalls === 1) throw new Error('temporary timeout'); return { ok: true }; } });
const recoveredOnce = await runAgentLoop(base, successRegistry, { plan: async () => ({ kind: 'act', tool: 'unstable_once', reason: 'test', input: {} }), evaluate: async () => ({ kind: 'complete', reason: 'verified' }) });
if (successCalls !== 2 || recoveredOnce.status !== 'completed') throw new Error('Single transient failure was not recovered.');

const denied = new ToolRegistry();
denied.register({ name: 'protected', description: 'protected test tool', execute: async () => ({ ok: true }) }, { requiresConfirmation: true });
const blocked = await runAgentLoop(base, denied, { plan: async () => ({ kind: 'act', tool: 'protected', reason: 'test', input: {} }), evaluate: async () => ({ kind: 'complete', reason: 'should not run' }) });
if (blocked.status !== 'waiting_for_user') throw new Error('Authorization failure did not stop for user.');
