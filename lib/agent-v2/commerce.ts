import type { AgentState, ToolDefinition } from './types';

export type CommerceAction = 'add_to_cart' | 'checkout' | 'cancel_order';
export type PermissionLevel = 'read' | 'user_confirmation' | 'blocked';

export type CommerceExecutor = {
  addToCart?: (input: { productId: string; quantity: number }) => Promise<unknown>;
  checkout?: (input: Record<string, unknown>) => Promise<unknown>;
  cancelOrder?: (input: { orderId: string }) => Promise<unknown>;
};

const permissionFor: Record<CommerceAction, PermissionLevel> = {
  add_to_cart: 'user_confirmation',
  checkout: 'user_confirmation',
  cancel_order: 'user_confirmation',
};

export function requiresConfirmation(action: CommerceAction): boolean {
  return permissionFor[action] === 'user_confirmation';
}

export function createCommerceTool(
  action: CommerceAction,
  executor: CommerceExecutor,
): ToolDefinition {
  return {
    name: action,
    description: `${action} commerce operation. Explicit user confirmation is required before execution.`,
    async execute(input, state: AgentState) {
      if (state.constraints.commerceConfirmed !== true) {
        return {
          status: 'confirmation_required',
          action,
          message: `User confirmation is required before ${action}.`,
        };
      }

      if (action === 'add_to_cart') {
        const data = input as { productId?: string; quantity?: number };
        if (!data.productId) throw new Error('productId is required.');
        return executor.addToCart?.({ productId: data.productId, quantity: Math.max(1, data.quantity ?? 1) });
      }

      if (action === 'checkout') return executor.checkout?.((input ?? {}) as Record<string, unknown>);

      const orderId = (input as { orderId?: string })?.orderId;
      if (!orderId) throw new Error('orderId is required.');
      return executor.cancelOrder?.({ orderId });
    },
  };
}

export function createCommerceReadTool(
  name: string,
  description: string,
  execute: (input: unknown) => Promise<unknown>,
): ToolDefinition {
  return { name, description, async execute(input) { return execute(input); } };
}
