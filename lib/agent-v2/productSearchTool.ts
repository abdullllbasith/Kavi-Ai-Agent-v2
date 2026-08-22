import type { AgentState, ToolDefinition } from './types';

export type ProductSearchItem = {
  product_id: string;
  name: string;
  price_lkr?: number;
  category?: string;
  in_stock?: boolean;
};

export type ProductSearchPage = {
  products: ProductSearchItem[];
  next_cursor?: string | null;
};

export type ProductSearchExecutor = (
  query: string,
  options: { limit: number; maxPrice?: number },
) => Promise<ProductSearchPage>;

export type SearchSession = {
  searches: Array<{ query: string; products: ProductSearchItem[] }>;
  selectedIds: string[];
  completed: boolean;
};

export function createSearchSession(): SearchSession {
  return { searches: [], selectedIds: [], completed: false };
}

export function buildProductSearchTool(
  executeSearch: ProductSearchExecutor,
  session: SearchSession,
): ToolDefinition<{ query: string; limit?: number; maxPrice?: number }, ProductSearchPage> {
  return {
    name: 'search_products',
    description: 'Search the live product catalog for candidates that advance the current goal.',
    execute: async (input, _state: AgentState) => {
      const query = input.query.trim();
      if (query.length < 2) throw new Error('Product search query must contain at least 2 characters.');

      const result = await executeSearch(query, {
        limit: Math.min(Math.max(input.limit ?? 12, 1), 24),
        maxPrice: input.maxPrice,
      });

      session.searches.push({ query, products: result.products });
      return result;
    },
  };
}

export function buildEvaluateSearchTool(
  session: SearchSession,
): ToolDefinition<
  { quality: 'good' | 'weak' | 'empty'; issues?: string[]; suggestedNextQueries?: string[] },
  { quality: string; resultCount: number; searchCount: number; canRefine: boolean; guidance: string }
> {
  return {
    name: 'evaluate_product_search',
    description: 'Evaluate the latest product-search observation and decide whether another search is justified.',
    execute: async (input) => {
      const latest = session.searches.at(-1);
      const resultCount = latest?.products.length ?? 0;
      const canRefine = session.searches.length < 3;

      return {
        quality: input.quality,
        resultCount,
        searchCount: session.searches.length,
        canRefine,
        guidance:
          !canRefine
            ? 'Search budget exhausted. Select the best available candidates.'
            : input.quality === 'good'
              ? 'Results are usable. The planner may complete the search.'
              : 'Results are weak. Refine the query before completing if the goal still needs better candidates.',
      };
    },
  };
}

export function buildCompleteProductSearchTool(
  session: SearchSession,
): ToolDefinition<{ productIds: string[]; reason: string }, { ok: boolean; selectedIds: string[]; reason: string }> {
  return {
    name: 'complete_product_search',
    description: 'Finish product discovery after evaluating candidates and select the products that best satisfy the goal.',
    execute: async ({ productIds, reason }) => {
      const known = new Set(session.searches.flatMap((search) => search.products.map((p) => p.product_id)));
      const selectedIds = [...new Set(productIds)].filter((id) => known.has(id));
      if (selectedIds.length === 0) throw new Error('Cannot complete product search without at least one known product id.');

      session.selectedIds = selectedIds;
      session.completed = true;
      return { ok: true, selectedIds, reason: reason.trim() };
    },
  };
}
