import type { AgentDecision, AgentController } from './agentLoop';
import type { AgentState } from './types';
import { ToolRegistry } from './toolRegistry';

function latestSearch(state: AgentState) {
  return [...state.observations].reverse().find((observation) => observation.source === 'search_products');
}

function latestEvaluation(state: AgentState) {
  return [...state.observations].reverse().find((observation) => observation.source === 'evaluate_product_search');
}

export function createProductSearchController(): AgentController {
  return {
    async plan(state: AgentState, _tools: ToolRegistry): Promise<AgentDecision> {
      if (!state.goal) {
        return { kind: 'ask_user', reason: 'A product-search goal could not be established safely.', question: 'What are you looking for, and is there a budget I should follow?' };
      }

      const searches = state.actions.filter((a) => a.tool === 'search_products' && a.status === 'succeeded').length;
      const evaluations = state.actions.filter((a) => a.tool === 'evaluate_product_search' && a.status === 'succeeded').length;
      const searchObservation = latestSearch(state);
      const searchData = searchObservation?.data as { products?: Array<{ product_id?: string }>; query?: string } | undefined;
      const products = searchData?.products ?? [];
      const evaluation = latestEvaluation(state)?.data as { canRefine?: boolean } | undefined;

      if (searches === 0) {
        return { kind: 'act', tool: 'search_products', reason: `Find candidates that advance the goal: ${state.goal.objective}`, input: { query: state.goal.objective, limit: 12 }, expectedOutcome: 'Return relevant in-stock product candidates.' };
      }

      if (evaluations === 0) {
        return { kind: 'act', tool: 'evaluate_product_search', reason: 'Assess the first candidate set before deciding whether to refine.', input: { quality: products.length >= 5 ? 'good' : products.length > 0 ? 'weak' : 'empty' } };
      }

      if (evaluation?.canRefine && products.length < 5 && searches < 3) {
        return { kind: 'act', tool: 'search_products', reason: 'The candidate set is weak, so refine the search instead of stopping early.', input: { query: `${searchData?.query ?? state.goal.objective} better options`, limit: 12 }, expectedOutcome: 'Improve candidate relevance without abandoning the goal.' };
      }

      const productIds = products.map((p) => p.product_id).filter((id): id is string => Boolean(id)).slice(0, 8);
      if (productIds.length === 0) return { kind: 'fail', reason: 'No valid product IDs were returned after the bounded search loop.' };

      return { kind: 'act', tool: 'complete_product_search', reason: 'Select the strongest known candidates after search and evaluation.', input: { productIds, reason: 'Best available candidates after bounded search refinement.' } };
    },

    async evaluate(state: AgentState, _result?: unknown): Promise<AgentDecision> {
      const last = state.actions.at(-1);
      if (last?.tool === 'complete_product_search') return { kind: 'complete', reason: 'Product discovery completed.' };
      return { kind: 'act', reason: 'Continue the bounded search loop.' };
    },
  };
}
