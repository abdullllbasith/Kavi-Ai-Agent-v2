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
import { createLLMPlanner, createLLMEvaluator, type LLMStructuredCall } from './llmPlanner';
import type { AgentState } from './types';

export type KaviV2Dependencies = {
  commerce?: CommerceExecutor;
  orders?: OrderExecutor;
  knowledge?: EmptyKnowledgeRetriever;
  llm: LLMStructuredCall;
};

export async function runKaviV2(userMessage: string, dependencies: KaviV2Dependencies) {
  const { registry, session } = createKaprukaSearchRegistry();
  registerProductIntelligenceTools(registry);

  const memory = new InMemoryAgentMemory();
  registry.register(createRecallMemoryTool(memory));
  registry.register(createRememberTool(memory));
  registry.register(createKnowledgeSearchTool(dependencies.knowledge ?? new EmptyKnowledgeRetriever()));

  if (dependencies.commerce) registerCommerceTools(registry, dependencies.commerce);
  if (dependencies.orders) for (const tool of registerOrderTools(dependencies.orders)) registry.register(tool);

  const initial = createAgentState(userMessage, 8);
  const language = detectLanguage(userMessage);
  const planner = createLLMPlanner(dependencies.llm);
  const evaluator = createLLMEvaluator(dependencies.llm);

  const finalState: AgentState = await runAgentLoop(initial, registry, {
    plan: planner,
    async evaluate(state, result) {
      const evaluation = await evaluator(state, result);
      if (evaluation.success && evaluation.score >= 0.8) return { kind: 'complete', reason: evaluation.reason };
      if (evaluation.nextAction?.kind === 'ask_user') return evaluation.nextAction;
      if (evaluation.nextAction?.kind === 'act') return evaluation.nextAction;
      return { kind: 'act', tool: 'search_products', reason: evaluation.reason, input: { query: state.userMessage, limit: 12 } };
    },
  });

  return {
    state: finalState,
    language,
    responsePolicy: buildResponsePolicy({ language }),
    selectedProductIds: session.selectedIds,
  };
}
