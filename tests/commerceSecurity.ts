import { ToolRegistry } from '../lib/agent-v2/toolRegistry.js';
import { registerCommerceTools } from '../lib/agent-v2/commerceRegistry.js';
import { createActionFingerprint } from '../lib/agent-v2/confirmation.js';
import type { AgentState } from '../lib/agent-v2/types.js';

const state: AgentState = {
  turnId: 'security-test', status: 'acting', userMessage: 'buy', goal: null,
  constraints: {}, plan: [], observations: [], actions: [], iteration: 1, maxIterations: 3,
};

let executed = false;
const registry = new ToolRegistry();
registerCommerceTools(registry, { addToCart: async () => { executed = true; return { ok: true }; } });

await expectReject(registry.execute('add_to_cart', { productId: 'p1', quantity: 1 }, state));
const confirmed = {
  ...state,
  constraints: {
    confirmation: {
      action: 'add_to_cart',
      fingerprint: createActionFingerprint('add_to_cart', { productId: 'p1', quantity: 1 }),
      confirmedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  },
};
await registry.execute('add_to_cart', { productId: 'p1', quantity: 1 }, confirmed);
if (!executed) throw new Error('Confirmed commerce action did not execute.');
await expectReject(registry.execute('add_to_cart', { productId: 'p2', quantity: 1 }, confirmed));

async function expectReject(promise: Promise<unknown>) {
  try { await promise; throw new Error('Expected commerce action to be rejected.'); } catch (error) {
    if (error instanceof Error && error.message === 'Expected commerce action to be rejected.') throw error;
  }
}
