import type { AgentState } from '../lib/agent-v2/types.js';
import type { LLMStructuredCall } from '../lib/agent-v2/llmPlanner.js';
import type { CommerceExecutor } from '../lib/agent-v2/commerce.js';

export function createMockLLM(decisions: unknown[], evaluations: unknown[]): LLMStructuredCall {
  let decisionIndex = 0;
  let evaluationIndex = 0;
  return async ({ system }: { system: string; user: string; schema: string }) => {
    if (system.includes('planning controller')) {
      return decisions[Math.min(decisionIndex++, decisions.length - 1)];
    }
    return evaluations[Math.min(evaluationIndex++, evaluations.length - 1)];
  };
}

export function createMockCommerce() {
  const calls: string[] = [];
  const executor: CommerceExecutor = {
    addToCart: async (input) => { calls.push(`add_to_cart:${input.productId}:${input.quantity}`); return { ok: true }; },
    checkout: async () => { calls.push('checkout'); return { ok: true }; },
    cancelOrder: async (input) => { calls.push(`cancel_order:${input.orderId}`); return { ok: true }; },
  };
  return { executor, calls };
}

export function successfulEvaluation() {
  return { success: true, score: 1, reason: 'Goal is satisfied.', missing: [] };
}

export function incompleteEvaluation(nextAction: Record<string, unknown>) {
  return { success: false, score: 0.4, reason: 'More evidence is required.', missing: ['required evidence'], nextAction };
}

export function stateWithConfirmation(): AgentState {
  return {
    turnId: 'test-turn', status: 'acting', userMessage: 'buy it', goal: null,
    constraints: { commerceConfirmed: true }, plan: [], observations: [], actions: [],
    iteration: 0, maxIterations: 8,
  };
}
