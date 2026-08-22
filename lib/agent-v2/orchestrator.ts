import { runAgentLoop } from './agentLoop';
import { createAgentState } from './state';
import { createKaprukaSearchRegistry } from './createKaprukaSearch';
import { registerProductIntelligenceTools } from './productIntelligenceRegistry';
import { InMemoryAgentMemory } from './memory';
import { EmptyKnowledgeRetriever } from './knowledge';
import { createKnowledgeSearchTool, createRecallMemoryTool, createRememberTool } from './memoryTools';
import { registerOrderTools, type OrderExecutor } from './orderTools';
import { registerCommerceTools } from './commerceRegistry';
import type { CommerceExecutor } from './commerce';
import { detectLanguage, buildResponsePolicy } from './language';
import type { AgentState } from './types';

export type KaviV2Dependencies = {
  commerce?: CommerceExecutor;
  orders?: OrderExecutor;
  knowledge?: EmptyKnowledgeRetriever;
};

export async function runKaviV2(userMessage: string, dependencies: KaviV2Dependencies = {}) {
  const { registry, session } = createKaprukaSearchRegistry();
  registerProductIntelligenceTools(registry);

  const memory = new InMemoryAgentMemory();
  registry.register(createRecallMemoryTool(memory));
  registry.register(createRememberTool(memory));
  registry.register(createKnowledgeSearchTool(dependencies.knowledge ?? new EmptyKnowledgeRetriever()));

  if (dependencies.commerce) registerCommerceTools(registry, dependencies.commerce);
  if (dependencies.orders) {
    for (const tool of registerOrderTools(dependencies.orders)) registry.register(tool);
  }

  const initial = createAgentState(userMessage, 8);
  const language = detectLanguage(userMessage);
  const finalState: AgentState = await runAgentLoop(initial, registry, {
    async plan(state) {
      if (!state.goal) {
        return {
          kind: 'act',
          tool: 'search_products',
          reason: 'Start with catalog discovery for a shopping request.',
          input: { query: state.userMessage, limit: 12, maxPrice: state.constraints.maxPrice },
        };
      }
      if (session.completed) return { kind: 'complete', reason: 'Shopping objective completed.' };
      return { kind: 'act', tool: 'search_products', reason: 'Continue product discovery.' };
    },
    async evaluate(state) {
      if (session.completed) return { kind: 'complete', reason: 'Search objective completed.' };
      if (state.iteration >= state.maxIterations) return { kind: 'fail', reason: 'Agent budget exhausted.' };
      return { kind: 'act', reason: 'Continue.' };
    },
  });

  return {
    state: finalState,
    language,
    responsePolicy: buildResponsePolicy({ language }),
    selectedProductIds: session.selectedIds,
  };
}
