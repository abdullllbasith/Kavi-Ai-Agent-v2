import { searchKaprukaProductsPage } from '../kaprukaMcp';
import type { ProductSearchExecutor } from './productSearchTool';

/**
 * V2 adapter around the existing Kapruka catalog executor.
 * The agent decides when/why to search; this adapter only executes that decision.
 */
export const executeKaprukaProductSearch: ProductSearchExecutor = async (
  query,
  options,
) => {
  const page = await searchKaprukaProductsPage(query, {
    limit: options.limit,
    max_price: options.maxPrice,
    in_stock_only: true,
    sort: 'relevance',
  });

  return {
    products: page.products.map((product) => ({
      product_id: product.product_id,
      name: product.name,
      price_lkr: product.price,
      category: product.category,
      in_stock: product.in_stock,
    })),
    next_cursor: page.next_cursor,
  };
};
