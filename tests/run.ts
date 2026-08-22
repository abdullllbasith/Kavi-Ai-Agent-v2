import { runGuardrailRegressionTests } from '../lib/agent-v2/guardrailEvaluation.js';

const result = runGuardrailRegressionTests();
console.log('Kavi V2 guardrail tests:', result);
