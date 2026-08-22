import { validateEvaluationDecision, validatePlannerDecision } from '../lib/agent-v2/decisionSchema.js';

const tools = ['search_products', 'add_to_cart'];
const rejects = [
  () => validatePlannerDecision({ kind: 'act', tool: 'delete_everything', reason: 'do it', input: {} }, tools),
  () => validatePlannerDecision({ kind: 'act', tool: 'search_products', reason: '', input: {} }, tools),
  () => validatePlannerDecision({ kind: 'act', tool: 'search_products', reason: 'ok', input: [] }, tools),
  () => validateEvaluationDecision({ success: true, score: 2, reason: 'ok', nextAction: null }, tools),
  () => validateEvaluationDecision({ success: false, score: 0.2, reason: 'need action', nextAction: { kind: 'act', tool: 'unknown', reason: 'x', input: {} } }, tools),
];
for (const attempt of rejects) {
  let rejected = false;
  try { attempt(); } catch { rejected = true; }
  if (!rejected) throw new Error('Adversarial decision was incorrectly accepted.');
}
