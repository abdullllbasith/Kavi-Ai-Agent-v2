import type { AgentAction } from './types';
import { hasRepeatedAction, validateActionBudget } from './guardrails';

const action = (tool: string, input: unknown, status: AgentAction['status'] = 'succeeded'): AgentAction => ({
  id: crypto.randomUUID(), tool, reason: 'test', input, status,
});

export function runGuardrailRegressionTests() {
  const repeated = [action('search_products', { query: 'gift' })];
  if (!hasRepeatedAction(repeated, 'search_products', { query: 'gift' })) throw new Error('Repeated action was not detected.');

  const diverse = [action('search_products', { query: 'gift' })];
  if (hasRepeatedAction(diverse, 'search_products', { query: 'laptop' })) throw new Error('Different action was incorrectly blocked.');

  const bounded = Array.from({ length: 3 }, (_, i) => action('search_products', { query: `q${i}` }));
  validateActionBudget(bounded, 'search_products');

  return { repeatedActionBlocked: true, differentActionAllowed: true, budgetAllowsDiverseCalls: true };
}
