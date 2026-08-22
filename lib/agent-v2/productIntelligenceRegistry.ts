import { ToolRegistry } from './toolRegistry';
import { createCompareProductsTool, createEvaluateProductFitTool, createRankProductsTool } from './productIntelligence';

export function registerProductIntelligenceTools(registry: ToolRegistry): ToolRegistry {
  registry.register(createCompareProductsTool());
  registry.register(createRankProductsTool());
  registry.register(createEvaluateProductFitTool());
  return registry;
}
