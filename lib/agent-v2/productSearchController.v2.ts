import type { AgentDecision, AgentController } from './agentLoop';
import type { AgentState } from './types';
import { ToolRegistry } from './toolRegistry';

function latestSearch(state: AgentState) {
  return [...state.observations].reverse().find((observation) => observation.source === 'search_products');
}

function latestEvaluation(state: AgentState) {
  return [...state.observations].reverse().find((observation) => observation.source === 'evaluate_product_search');
}

function productIdsFromLatestSearch(state: AgentState): string[] {
  const data = latestSearch(state)?.data as { products?: Array<{ product_id?: string }> } | undefined;
  return (data?.products ?? []).map((p) => p.product_id).filter((id): id is string => typeof id === 'string').slice(0, 8);
}

export function createProductSearchControllerV2(): AgentController {
  return {
    async plan(state: AgentState, _tools: ToolRegistry): Promise<AgentDecision> {
      if (!state.goal) return { kind: 'ask_user', reason: 'No safe product goal was established.', question: 'What are you looking for, and what budget should I follow?' };
      if (!latestSearch(state)) return { kind: 'act', tool: 'search_products', reason: `Find candidates for: ${state.goal.objective}`, input: { query: state.goal.objective, limit: 12 }, expectedOutcome: 'Relevant in-stock candidates.' };

      const evaluation = latestEvaluation(state)?.data as { canRefine?: boolean } | undefined;
      if (evaluation?.canRefine) {
        const previous = latestSearch(state)?.data as { query?: string } | undefined;
        return { kind: 'act', tool: 'search_products', reason: 'Refine weak candidates instead of stopping early.', input: { query: `${previous?.query ?? state.goal.objective} better options`, limit: 12 }, expectedOutcome: 'Improve relevance.' };
      }

      const productIds = productIdsFromLatestSearch(state);
      if (!productIds.length) return { kind: 'fail', reason: 'No candidates remain after bounded search.' };
      return { kind: 'act', tool: 'complete_product_search', reason: 'Select the strongest known candidates.', input: { productIds, reason: 'Best available candidates after bounded refinement.' }, expectedOutcome: 'Valid selected product IDs.' };
    },

    async evaluate(state: AgentState): Promise<AgentDecision> {
      const last = state.actions.at(-1);
      if (last?.tool === 'search_products') {
        const data = latestSearch(state)?.data as { products?: unknown[] } | undefined;
        const count = data?.products?.length ?? 0;
        return { kind: 'act', tool: 'evaluate_product_search', reason: 'Evaluate search quality before deciding whether to refine.', input: { quality: count >= 5 ? 'good' : count > 0 ? 'weak' : 'empty', issues: count < 3 ? ['Too few candidates'] : [] }, expectedOutcome: 'Decide whether another search is justified.' };
      }
      if (last?.tool === 'complete_product_search') return { kind: 'complete', reason: 'Product discovery completed.' };
      return { kind: 'complete', reason: 'No further search action is required.' };
    },
  };
}
