import { validateEvaluationDecision } from '../lib/agent-v2/decisionSchema.js';

const criteria = ['relevant products', 'available products', 'within LKR 5000'];
const incomplete = validateEvaluationDecision({ success: false, score: 0.9, reason: 'Budget is not verified.', missing: ['within LKR 5000'], satisfiedCriteria: ['relevant products', 'available products'], nextAction: null }, ['search_products'], criteria);
if (incomplete.success) throw new Error('Evaluator incorrectly accepted incomplete goal evidence.');

const complete = validateEvaluationDecision({ success: true, score: 0.95, reason: 'All criteria are satisfied by observations.', missing: [], satisfiedCriteria: criteria, nextAction: null }, ['search_products'], criteria);
if (!complete.success) throw new Error('Evaluator rejected complete goal evidence.');

try {
  validateEvaluationDecision({ success: true, score: 1, reason: 'done', missing: [], satisfiedCriteria: ['invented criterion'], nextAction: null }, ['search_products'], criteria);
  throw new Error('Expected invalid criterion to be rejected.');
} catch (error) {
  if (error instanceof Error && error.message === 'Expected invalid criterion to be rejected.') throw error;
}
