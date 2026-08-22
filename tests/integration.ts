import { runKaviV2 } from '../lib/agent-v2/orchestrator.js';
import { createMockCommerce, createMockLLM, incompleteEvaluation, successfulEvaluation } from './mockEnvironment.js';

export async function runIntegrationScenarios() {
  const commerce = createMockCommerce();
  const result = await runKaviV2('Find me a gift under LKR 10000', {
    commerce: commerce.executor,
    llm: createMockLLM(
      [
        { kind: 'act', tool: 'search_products', reason: 'Find candidates.', input: { query: 'gift', limit: 5 } },
        { kind: 'complete', reason: 'Candidates found.' },
      ],
      [successfulEvaluation()],
    ),
  });

  if (result.state.status !== 'completed') throw new Error(`Expected completed state, got ${result.state.status}`);
  if (!result.state.actions.some((action) => action.tool === 'search_products')) throw new Error('Search action was not executed.');

  const commerceResult = await runKaviV2('Buy this product', {
    commerce: commerce.executor,
    llm: createMockLLM(
      [{ kind: 'act', tool: 'add_to_cart', reason: 'User requested purchase.', input: { productId: 'p1', quantity: 1 } }],
      [incompleteEvaluation({ kind: 'ask_user', reason: 'Confirmation is required.', question: 'Confirm adding this product to your cart.' })],
    ),
  });

  if (commerceResult.state.status !== 'waiting_for_user') throw new Error(`Expected confirmation boundary, got ${commerceResult.state.status}`);
  if (commerce.calls.length !== 0) throw new Error('Commerce executor ran before confirmation.');

  return { shoppingScenario: 'passed', commerceConfirmationScenario: 'passed' };
}
