import { CORE_EVALUATION_CASES, evaluateState } from './evaluation';
import type { AgentState } from './types';

export type AgentRunner = (userMessage: string) => Promise<{ state: AgentState }>;

export async function runCoreEvaluations(run: AgentRunner) {
  const results: Array<{ name: string; passed: boolean; failures: string[] }> = [];
  for (const testCase of CORE_EVALUATION_CASES) {
    try {
      const result = await run(testCase.userMessage);
      const failures = evaluateState(result.state, testCase);
      results.push({ name: testCase.name, passed: failures.length === 0, failures });
    } catch (error) {
      results.push({ name: testCase.name, passed: false, failures: [error instanceof Error ? error.message : String(error)] });
    }
  }
  return results;
}
