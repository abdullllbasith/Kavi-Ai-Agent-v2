import type { AgentState } from './types';
import { requireRecord, requirePositiveInteger, requireString } from './inputValidation';
import { requireCommerceUser, validateAddToCartInput, validateCancelOrderInput } from './secureCommerce';

const state = (overrides: Partial<AgentState> = {}): AgentState => ({
  turnId: 'test-turn', status: 'planning', userMessage: 'test', goal: null, constraints: {}, plan: [], observations: [], actions: [], iteration: 0, maxIterations: 8, ...overrides,
});

export function runSecurityRegressionTests() {
  if (requireString({ id: ' p1 ' }, 'id', 'test') !== 'p1') throw new Error('String normalization failed.');
  if (requirePositiveInteger({}, 'quantity', 'test') !== 1) throw new Error('Integer fallback failed.');
  try { requireRecord('bad', 'test'); throw new Error('Primitive input was accepted.'); } catch (error) { if (error instanceof Error && error.message === 'Primitive input was accepted.') throw error; }
  if (validateAddToCartInput({ productId: 'p1', quantity: 2 }).quantity !== 2) throw new Error('Cart input validation failed.');
  if (validateCancelOrderInput({ orderId: 'o1' }).orderId !== 'o1') throw new Error('Order input validation failed.');
  try { requireCommerceUser(state()); throw new Error('Unauthenticated commerce access was accepted.'); } catch (error) { if (error instanceof Error && error.message === 'Unauthenticated commerce access was accepted.') throw error; }
  return { inputValidation: true, commerceIdentityRequired: true, resourceValidation: true };
}
