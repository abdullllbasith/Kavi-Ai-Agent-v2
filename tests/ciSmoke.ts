import { validatePlannerDecision, validateEvaluationDecision } from '../lib/agent-v2/decisionSchema.js';

const planner = validatePlannerDecision({ kind: 'act', tool: 'search_products', reason: 'find relevant products', input: { query: 'gift' } }, ['search_products']);
if (planner.kind !== 'act' || planner.tool !== 'search_products') throw new Error('Planner validation smoke test failed.');

const evaluation = validateEvaluationDecision({ success: false, score: 0.4, reason: 'criteria remain unmet', missing: ['price'], nextAction: { kind: 'act', tool: 'search_products', reason: 'verify price', input: { query: 'gift' } } }, ['search_products']);
if (evaluation.success || evaluation.score !== 0.4 || evaluation.nextAction?.kind !== 'act') throw new Error('Evaluator validation smoke test failed.');

console.log('Kavi V2 CI smoke: PASS');
