import type { AgentAction } from './types';

export type GuardrailConfig = {
  maxCallsPerTool: number;
  maxTotalCalls: number;
  maxRetriesPerAction: number;
};

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxCallsPerTool: 3,
  maxTotalCalls: 12,
  maxRetriesPerAction: 1,
};

export function validateActionBudget(actions: AgentAction[], tool: string, config = DEFAULT_GUARDRAILS): void {
  if (actions.length >= config.maxTotalCalls) throw new Error('Agent action budget exhausted.');
  const toolCalls = actions.filter((action) => action.tool === tool);
  if (toolCalls.length >= config.maxCallsPerTool) throw new Error(`Tool call budget exhausted for ${tool}.`);
  const latest = toolCalls.at(-1);
  if (latest?.status === 'failed' && toolCalls.filter((a) => a.status === 'failed').length > config.maxRetriesPerAction) {
    throw new Error(`Retry budget exhausted for ${tool}.`);
  }
}

export function hasRepeatedAction(actions: AgentAction[], tool: string, input: unknown, window = 3): boolean {
  const signature = JSON.stringify(input ?? {});
  return actions.slice(-window).some((action) => action.tool === tool && JSON.stringify(action.input ?? {}) === signature);
}
