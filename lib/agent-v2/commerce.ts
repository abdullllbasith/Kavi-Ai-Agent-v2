import type { AgentState, ToolDefinition } from './types';
import { consumeConfirmation } from './confirmation';
export type CommerceAction = 'add_to_cart' | 'checkout' | 'cancel_order';
export type PermissionLevel = 'read' | 'user_confirmation' | 'blocked';
export type CheckoutInput = { cartId: string; shippingAddressId?: string; paymentMethodId?: string; deliveryOptionId?: string; [key: string]: unknown };
export type CommerceExecutor = { addToCart?: (input: { productId: string; quantity: number }) => Promise<unknown>; checkout?: (input: CheckoutInput) => Promise<unknown>; cancelOrder?: (input: { orderId: string }) => Promise<unknown>; authorize?: (userId: string, action: CommerceAction, input: Record<string, unknown>) => Promise<boolean> | boolean };
const permissionFor: Record<CommerceAction, PermissionLevel> = { add_to_cart: 'user_confirmation', checkout: 'user_confirmation', cancel_order: 'user_confirmation' };
export function requiresConfirmation(action: CommerceAction): boolean { return permissionFor[action] === 'user_confirmation'; }
export function createCommerceTool(action: CommerceAction, executor: CommerceExecutor): ToolDefinition {
  return { name: action, description: `${action} commerce operation. Authenticated ownership and explicit user confirmation are required before execution.`, async execute(input, state: AgentState) => {
    const userId = state.security?.userId?.trim() || (typeof state.constraints.userId === 'string' ? state.constraints.userId.trim() : '');
    if (!userId) throw new Error('Authenticated user is required for commerce operations.');
    if (!executor.authorize) throw new Error(`Commerce authorization is not configured for ${action}.`);
    if (!(await executor.authorize(userId, action, input as Record<string, unknown>))) throw new Error(`Commerce authorization denied: ${action}.`);
    if (requiresConfirmation(action)) consumeConfirmation(state, action, input);
    if (action === 'add_to_cart') { const data = input as { productId?: string; quantity?: number }; if (!data.productId) throw new Error('productId is required.'); return executor.addToCart?.({ productId: data.productId, quantity: Math.max(1, data.quantity ?? 1) }); }
    if (action === 'checkout') return executor.checkout?.(input as CheckoutInput);
    const orderId = (input as { orderId?: string })?.orderId; if (!orderId) throw new Error('orderId is required.'); return executor.cancelOrder?.({ orderId });
  } };
}
export function createCommerceReadTool(name: string, description: string, execute: (input: unknown, state: AgentState) => Promise<unknown>): ToolDefinition { return { name, description, async execute(input, state) { return execute(input, state); } }; }
