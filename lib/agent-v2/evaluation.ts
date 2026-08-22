import type { AgentState } from './types';

export type EvaluationCase = {
  name: string;
  userMessage: string;
  expectStatus?: AgentState['status'];
  expectTool?: string;
  expectConfirmation?: boolean;
};

export function assertEvaluation(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Agent evaluation failed: ${message}`);
}

export function evaluateState(state: AgentState, testCase: EvaluationCase): string[] {
  const failures: string[] = [];
  if (testCase.expectStatus && state.status !== testCase.expectStatus) failures.push(`expected status ${testCase.expectStatus}, got ${state.status}`);
  if (testCase.expectTool && !state.actions.some((action) => action.tool === testCase.expectTool)) failures.push(`expected tool ${testCase.expectTool} was not called`);
  if (testCase.expectConfirmation && state.status !== 'waiting_for_user') failures.push('expected explicit user confirmation boundary');
  return failures;
}

export const CORE_EVALUATION_CASES: EvaluationCase[] = [
  { name: 'bounded search', userMessage: 'Find me a gift under LKR 10000', expectTool: 'search_products' },
  { name: 'commerce confirmation', userMessage: 'Buy this product for me', expectConfirmation: true },
  { name: 'order read', userMessage: 'Where is my order?', expectTool: 'get_order_status' },
  { name: 'clarification', userMessage: 'Find something good', expectStatus: 'waiting_for_user' },
];
