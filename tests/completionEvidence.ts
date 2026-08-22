import { runAgentLoop } from '../lib/agent-v2/agentLoop.js';
import { ToolRegistry } from '../lib/agent-v2/toolRegistry.js';
import { createAgentState } from '../lib/agent-v2/state.js';

const tools = new ToolRegistry();
const state = createAgentState('test', 2);
const result = await runAgentLoop(state, tools, {
  async plan() { return { kind: 'complete', reason: 'hallucinated completion' }; },
  async evaluate() { return { kind: 'fail', reason: 'unreachable' }; },
});
if (result.status === 'completed') throw new Error('Planner completed without evidence.');
