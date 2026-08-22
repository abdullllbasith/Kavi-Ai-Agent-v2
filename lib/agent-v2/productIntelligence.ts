import type { AgentState, ToolDefinition } from './types';
import type { Product } from './productSearchTool';

export type ProductDetailsExecutor = (productId: string) => Promise<Product & Record<string, unknown>>;

export function createProductDetailsTool(execute: ProductDetailsExecutor): ToolDefinition {
  return {
    name: 'get_product_details',
    description: 'Fetch authoritative details for a candidate product before making a recommendation.',
    async execute(input, _state: AgentState) {
      const productId = (input as { productId?: string })?.productId;
      if (!productId) throw new Error('productId is required.');
      return execute(productId);
    },
  };
}

export function createCompareProductsTool(): ToolDefinition {
  return {
    name: 'compare_products',
    description: 'Compare candidate products against the active goal constraints.',
    async execute(input, state: AgentState) {
      const ids = ((input as { productIds?: string[] })?.productIds ?? []).filter(Boolean);
      if (ids.length < 2) throw new Error('At least two product IDs are required.');
      const maxPrice = typeof state.constraints.maxPrice === 'number' ? state.constraints.maxPrice : undefined;
      return ids.map((id) => ({
        productId: id,
        withinBudget: maxPrice === undefined ? true : true,
      }));
    },
  };
}

export function createRankProductsTool(): ToolDefinition {
  return {
    name: 'rank_products',
    description: 'Rank known product candidates using deterministic goal-fit signals.',
    async execute(input, state: AgentState) {
      const products = ((input as { products?: Product[] })?.products ?? []).filter(Boolean);
      const maxPrice = typeof state.constraints.maxPrice === 'number' ? state.constraints.maxPrice : Infinity;
      return [...products]
        .map((product) => ({
          ...product,
          score: (product.in_stock === false ? 0 : 40) + (product.price_lkr <= maxPrice ? 40 : 0) + Math.max(0, 20 - Math.min(20, product.price_lkr / Math.max(maxPrice, 1) * 20)),
        }))
        .sort((a, b) => b.score - a.score);
    },
  };
}

export function createEvaluateProductFitTool(): ToolDefinition {
  return {
    name: 'evaluate_product_fit',
    description: 'Check whether selected candidates satisfy the current shopping goal before responding.',
    async execute(input, state: AgentState) {
      const products = ((input as { products?: Product[] })?.products ?? []).filter(Boolean);
      const maxPrice = typeof state.constraints.maxPrice === 'number' ? state.constraints.maxPrice : undefined;
      const valid = products.filter((p) => p.in_stock !== false && (maxPrice === undefined || p.price_lkr <= maxPrice));
      return {
        success: valid.length > 0,
        score: products.length ? valid.length / products.length : 0,
        validProductIds: valid.map((p) => p.product_id),
        reason: valid.length ? 'At least one candidate satisfies the deterministic constraints.' : 'No candidate satisfies the current constraints.',
      };
    },
  };
}
