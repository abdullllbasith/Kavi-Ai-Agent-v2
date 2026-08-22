import { ToolRegistry } from './toolRegistry';
import { createCommerceTool, type CommerceExecutor, type CommerceAction } from './commerce';
import { createActionFingerprint, isConfirmationValid } from './confirmation';

const commerceActions: CommerceAction[] = ['add_to_cart', 'checkout', 'cancel_order'];

export function registerCommerceTools(registry: ToolRegistry, executor: CommerceExecutor): ToolRegistry {
  for (const action of commerceActions) {
    registry.register(createCommerceTool(action, executor), {
      requiresConfirmation: true,
      validate: (input) => {
        if (action === 'add_to_cart') {
          const data = input as { productId?: unknown; quantity?: unknown };
          if (typeof data.productId !== 'string' || !data.productId.trim()) throw new Error('productId is required.');
          if (data.quantity !== undefined && (!Number.isInteger(data.quantity) || Number(data.quantity) <= 0)) throw new Error('quantity must be a positive integer.');
        }
        if (action === 'cancel_order') {
          const data = input as { orderId?: unknown };
          if (typeof data.orderId !== 'string' || !data.orderId.trim()) throw new Error('orderId is required.');
        }
      },
      authorize: (input, state) => {
        const confirmation = state.constraints.confirmation;
        return isConfirmationValid(state, action, input) || confirmation === createActionFingerprint(action, input);
      },
    });
  }
  return registry;
}
