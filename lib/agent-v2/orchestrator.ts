import { runAgentLoop } from './agentLoop';
import { createAgentState } from './state';
import { establishGoal } from './goalManager';
import { createKaprukaSearchRegistry } from './createKaprukaSearch';
import { registerProductIntelligenceTools } from './productIntelligenceRegistry';
import { InMemoryAgentMemory } from './memory';
import { EmptyKnowledgeRetriever, type KnowledgeRetriever } from './knowledge';
import { createKnowledgeSearchTool, createRecallMemoryTool, createRememberTool } from './memoryTools';
import { registerOrderTools, type OrderExecutor } from './orderTools';
import { registerCommerceTools } from './commerceRegistry';
import type { CommerceExecutor } from './commerce';
import { detectLanguage, buildResponsePolicy } from './language';
import { createLLMPlanner, createLLMEvaluator, type LLMStructuredCall } from './llmPlanner';
import type { AgentState } from './types';
import type { MemoryStore as PersistentMemoryStore } from './memoryStore';
import { createMemoryAdapter } from './memoryAdapter';
import type { KnowledgeBase } from './rag';
import { createKnowledgeRetrieverAdapter } from './ragAdapter';

export type KaviV2Dependencies = { userId: string; commerce?: CommerceExecutor; orders?: OrderExecutor; knowledge?: KnowledgeRetriever; knowledgeBase?: KnowledgeBase; memory?: PersistentMemoryStore; llm: LLMStructuredCall };

export async function runKaviV2(userMessage: string, dependencies: KaviV2Dependencies) {
  if (!dependencies.userId?.trim()) throw new Error('userId is required.');
  const { registry, session } = createKaprukaSearchRegistry();
  registerProductIntelligenceTools(registry);
  const memory = dependencies.memory ? createMemoryAdapter(dependencies.memory, dependencies.userId) : new InMemoryAgentMemory();
  registry.register(createRecallMemoryTool(memory));
  registry.register(createRememberTool(memory));
  const knowledge = dependencies.knowledge ?? (dependencies.knowledgeBase ? createKnowledgeRetrieverAdapter(dependencies.knowledgeBase) : new EmptyKnowledgeRetriever());
  registry.register(createKnowledgeSearchTool(knowledge));
  if (dependencies.commerce) registerCommerceTools(registry, dependencies.commerce);
  if (dependencies.orders) for (const tool of registerOrderTools(dependencies.orders)) registry.register(tool);

  const initial = createAgentState(userMessage, 8);
  const withGoal = establishGoal(initial);
  const initialState: AgentState = { ...withGoal, constraints: { ...withGoal.constraints, userId: dependencies.userId } };
  const language = detectLanguage(userMessage);
  const planner = createLLMPlanner(dependencies.llm);
  const evaluator = createLLMEvaluator(dependencies.llm);
  const finalState: AgentState = await runAgentLoop(initialState, registry, {
    plan: planner,
    async evaluate(state, result, tools) {
      const evaluation = await evaluator(state, result, tools);
      if (evaluation.success && evaluation.score >= 0.8) return { kind: 'complete', reason: evaluation.reason };
      if (evaluation.nextAction?.kind === 'ask_user') return evaluation.nextAction;
      if (evaluation.nextAction?.kind === 'act') return evaluation.nextAction;
      return { kind: 'fail', reason: evaluation.reason };
    },
  });
  return { state: finalState, userId: dependencies.userId, language, responsePolicy: buildResponsePolicy({ language }), selectedProductIds: session.selectedIds };
}
