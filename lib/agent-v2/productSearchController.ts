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
        return {
          kind: 'ask_user',
          reason: 'A product-search goal could not be established safely.',
          question: 'What are you looking for, and is there a budget I should follow?',
        };
      }

      if (!latestSearch(state)) {
        return {
          kind: 'act',
          tool: 'search_products',
          reason: `Find candidates that advance the goal: ${state.goal.objective}`,
          input: { query: state.goal.objective, limit: 12 },
          expectedOutcome: 'Return relevant in-stock product candidates.',
        };
      }

      const evaluation = latestEvaluation(state)?.data as
        | { canRefine?: boolean; guidance?: string }
        | undefined;

      if (evaluation?.canRefine) {
        const lastQuery = latestSearch(state)?.data as { query?: string } | undefined;
        return {
          kind: 'act',
          tool: 'search_products',
          reason: 'The previous candidate set was not yet strong enough, so refine the search rather than stopping early.',
          input: { query: `${lastQuery?.query ?? state.goal.objective} better options`, limit: 12 },
          expectedOutcome: 'Improve candidate relevance without abandoning the user goal.',
        };
      }

      return {
        kind: 'act',
        tool: 'complete_product_search',
        reason: 'Search budget is exhausted; select the strongest known candidates and complete the discovery task.',
        input: { productIds: [], reason: 'Best available candidates after bounded search refinement.' },
      };
    },

    async evaluate(state: AgentState, _result?: unknown): Promise<AgentDecision> {
      const last = state.actions.at(-1);
      if (last?.tool === 'search_products') {
        const observation = latestSearch(state);
        const data = observation?.data as { products?: unknown[] } | undefined;
        const count = data?.products?.length ?? 0;
        return {
          kind: 'act',
          tool: 'evaluate_product_search',
          reason: count >= 3 ? 'Assess whether the returned candidates satisfy the goal.' : 'Assess the weak result set before deciding whether to refine.',
          input: {
            quality: count >= 5 ? 'good' : count > 0 ? 'weak' : 'empty',
            issues: count < 3 ? ['Too few candidates'] : [],
          },
          expectedOutcome: 'Determine whether another search is justified.',
        };
      }

      if (last?.tool === 'complete_product_search') return { kind: 'complete', reason: 'Product discovery completed.' };
      return { kind: 'act', tool: 'evaluate_product_search', reason: 'Evaluate the latest search observation.', input: { quality: 'weak' } };
    },
  };
}
