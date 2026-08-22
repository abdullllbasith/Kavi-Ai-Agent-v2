import type { AgentState } from './types';
import { requirePositiveInteger, requireRecord, requireString } from './inputValidation';

export type CommerceUserContext = { userId: string };
export type CommerceAuthorization = (input: { userId: string; action: string; resourceId?: string }) => Promise<boolean>;

export function requireCommerceUser(state: AgentState, context?: CommerceUserContext): string {
  const userId = context?.userId ?? state.constraints.userId;
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Authenticated user context is required for commerce actions.');
  return userId;
}

export function validateAddToCartInput(input: unknown) {
  const data = requireRecord(input, 'add_to_cart');
  return { productId: requireString(data, 'productId', 'add_to_cart'), quantity: requirePositiveInteger(data, 'quantity', 'add_to_cart') };
}

export function validateCancelOrderInput(input: unknown) {
  const data = requireRecord(input, 'cancel_order');
  return { orderId: requireString(data, 'orderId', 'cancel_order') };
}

export async function authorizeCommerceAction(
  state: AgentState,
  context: CommerceUserContext | undefined,
  action: string,
  resourceId: string | undefined,
  authorize?: CommerceAuthorization,
): Promise<void> {
  const userId = requireCommerceUser(state, context);
  if (authorize && !(await authorize({ userId, action, resourceId }))) throw new Error('Commerce action is not authorized for this user.');
  if (state.constraints.commerceConfirmed !== true) throw new Error(`Explicit confirmation is required before ${action}.`);
}
