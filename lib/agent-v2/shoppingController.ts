import type { AgentState } from './types';
import type { AgentDecision, AgentController } from './agentLoop';
import type { ToolRegistry } from './toolRegistry';
import { establishGoal } from './goalManager';
import type { SearchSession } from './productSearchTool';

function latestProducts(session: SearchSession) {
  return session.searches.at(-1)?.products ?? [];
}

export function createShoppingController(session: SearchSession): AgentController {
  return {
    async plan(rawState: AgentState, _tools: ToolRegistry): Promise<AgentDecision> {
      const state = establishGoal(rawState);
      const searches = session.searches;
      const latest = latestProducts(session);

      if (session.completed) return { kind: 'complete', reason: 'Shopping search is already complete.' };

      if (searches.length === 0) {
        const query = state.goal?.objective ?? state.userMessage;
        return {
          kind: 'act',
          tool: 'search_products',
          reason: 'Search for initial candidates that advance the active shopping goal.',
          input: {
            query,
            limit: 12,
            maxPrice: typeof state.constraints.maxPrice === 'number' ? state.constraints.maxPrice : undefined,
          },
          expectedOutcome: 'Find relevant in-stock products for the active goal.',
        };
      }

      const lastAction = state.actions.at(-1);
      if (lastAction?.tool === 'search_products' && latest.length > 0 && session.evaluations === 0) {
        return {
          kind: 'act',
          tool: 'evaluate_product_search',
          reason: 'Evaluate the search observation before deciding whether to refine or finish.',
          input: {
            quality: latest.length >= 5 ? 'good' : 'weak',
            issues: latest.length < 5 ? ['few candidates'] : [],
          },
        };
      }

      if (latest.length === 0 && session.searches.length < 3) {
        return {
          kind: 'act',
          tool: 'search_products',
          reason: 'The previous search returned no candidates, so broaden the query.',
          input: { query: `${state.goal?.type ?? 'products'} ${state.goal?.objective ?? ''}`, limit: 12 },
          expectedOutcome: 'Recover useful candidates after an empty result.',
        };
      }

      if (!session.completed && session.evaluations > 0) {
        if (session.searches.length < 3 && session.evaluations < 3 && latest.length < 5) {
          return {
            kind: 'act',
            tool: 'search_products',
            reason: 'The latest candidates are weak, so refine the search before completing the goal.',
            input: {
              query: `better ${state.goal?.objective ?? state.userMessage}`,
              limit: 12,
              maxPrice: typeof state.constraints.maxPrice === 'number' ? state.constraints.maxPrice : undefined,
            },
            expectedOutcome: 'Find stronger candidates that better satisfy the goal.',
          };
        }

        return {
          kind: 'act',
          tool: 'complete_product_search',
          reason: 'The search budget has produced enough candidates to satisfy the discovery goal.',
          input: {
            productIds: latest.slice(0, 6).map((product) => product.product_id),
            reason: 'Selected the strongest available candidates after search evaluation.',
          },
        };
      }

      return { kind: 'fail', reason: 'Unable to determine a safe next shopping action.' };
    },

    async evaluate(state: AgentState): Promise<AgentDecision> {
      if (session.completed) return { kind: 'complete', reason: 'Product discovery completed.' };
      if (state.iteration >= state.maxIterations) return { kind: 'fail', reason: 'Agent iteration budget exhausted.' };
      return { kind: 'act', reason: 'Continue evaluating the active goal.' };
    },
  };
}
