import { runGuardrailRegressionTests } from '../lib/agent-v2/guardrailEvaluation.js';
import { runIntegrationScenarios } from './integration.js';

const guardrails = runGuardrailRegressionTests();
console.log('Kavi V2 guardrail tests:', guardrails);

const integration = await runIntegrationScenarios();
console.log('Kavi V2 integration tests:', integration);
