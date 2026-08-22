import { ToolRegistry } from './toolRegistry';
import { buildProductSearchTool, createSearchSession, buildEvaluateSearchTool, buildCompleteProductSearchTool } from './productSearchTool';
import { executeKaprukaProductSearch } from './kaprukaProductSearchAdapter';

export function createKaprukaSearchRegistry(): { registry: ToolRegistry; session: ReturnType<typeof createSearchSession> } {
  const registry = new ToolRegistry();
  const session = createSearchSession();

  registry.register(buildProductSearchTool(executeKaprukaProductSearch, session));
  registry.register(buildEvaluateSearchTool(session));
  registry.register(buildCompleteProductSearchTool(session));

  return { registry, session };
}
