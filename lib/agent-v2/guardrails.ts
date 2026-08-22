import type { AgentAction } from './types';

export type GuardrailConfig = { maxCallsPerTool: number; maxTotalCalls: number; maxRetriesPerAction: number };
export const DEFAULT_GUARDRAILS: GuardrailConfig = { maxCallsPerTool: 3, maxTotalCalls: 12, maxRetriesPerAction: 1 };

export function validateActionBudget(actions: AgentAction[], tool: string, config = DEFAULT_GUARDRAILS): void {
  if (actions.length >= config.maxTotalCalls) throw new Error('Agent action budget exhausted.');
  const toolCalls = actions.filter((action) => action.tool === tool);
  if (toolCalls.length >= config.maxCallsPerTool) throw new Error(`Tool call budget exhausted for ${tool}.`);
  const failed = toolCalls.filter((action) => action.status === 'failed').length;
  if (failed > config.maxRetriesPerAction) throw new Error(`Retry budget exhausted for ${tool}.`);
}

export function hasRepeatedAction(actions: AgentAction[], tool: string, input: unknown, window = 3): boolean {
  const signature = JSON.stringify(input ?? {});
  const recent = actions.slice(-window);
  return recent.some((action) => {
    if (action.tool !== tool || JSON.stringify(action.input ?? {}) !== signature) return false;
    // An identical action is a legitimate retry only when the previous attempt failed.
    return action.status !== 'failed';
  });
}
