import { ToolRegistry } from './toolRegistry';
import { createCommerceTool, type CommerceExecutor } from './commerce';

export function registerCommerceTools(registry: ToolRegistry, executor: CommerceExecutor): ToolRegistry {
  registry.register(createCommerceTool('add_to_cart', executor));
  registry.register(createCommerceTool('checkout', executor));
  registry.register(createCommerceTool('cancel_order', executor));
  return registry;
}
