import { ToolRegistry } from './toolRegistry';
import { createCommerceTool, type CommerceExecutor, type CommerceAction } from './commerce';
import { isConfirmationValid } from './confirmation';

const commerceActions: CommerceAction[] = ['add_to_cart', 'checkout', 'cancel_order'];

export function registerCommerceTools(registry: ToolRegistry, executor: CommerceExecutor): ToolRegistry {
  for (const action of commerceActions) {
    registry.register(createCommerceTool(action, executor), {
      requiresConfirmation: true,
      validate: (input) => {
        const data = input as Record<string, unknown>;
        if (action === 'add_to_cart') {
          if (typeof data.productId !== 'string' || !data.productId.trim()) throw new Error('productId is required.');
          if (data.quantity !== undefined && (!Number.isInteger(data.quantity) || Number(data.quantity) <= 0)) throw new Error('quantity must be a positive integer.');
        }
        if (action === 'cancel_order') {
          if (typeof data.orderId !== 'string' || !data.orderId.trim()) throw new Error('orderId is required.');
        }
        if (action === 'checkout') {
          const keys = Object.keys(data);
          if (keys.length === 0) throw new Error('Checkout input is required.');
        }
      },
      authorize: (input, state) => isConfirmationValid(state, action, input),
    });
  }
  return registry;
}
