import type { AgentState, Goal } from './types';

export type GoalExtraction = {
  objective: string;
  type?: string;
  successCriteria: string[];
  constraints: Record<string, unknown>;
  confidence: number;
};

function extractBudget(message: string): number | undefined {
  const match = message.match(/(?:rs\.?|lkr)\s*([\d,]+)/i) ?? message.match(/([\d,]+)\s*(?:rs\.?|lkr)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

export function inferShoppingGoal(message: string): GoalExtraction {
  const lower = message.toLowerCase();
  const budget = extractBudget(message);
  const type = /gift|present|birthday|graduat|anniversary|wedding|valentine/.test(lower) ? 'gift' : 'shopping';
  const successCriteria = ['relevant products', 'available products'];
  if (type === 'gift') successCriteria.push('appropriate for the recipient and occasion');
  if (budget) successCriteria.push(`within LKR ${budget}`);

  return {
    objective: message.trim(),
    type,
    successCriteria,
    constraints: budget ? { maxPrice: budget } : {},
    confidence: type === 'gift' ? 0.9 : 0.72,
  };
}

export function establishGoal(state: AgentState): AgentState {
  if (state.goal) return state;
  const extraction = inferShoppingGoal(state.userMessage);
  const now = new Date().toISOString();
  const goal: Goal = {
    id: crypto.randomUUID(),
    objective: extraction.objective,
    type: extraction.type,
    successCriteria: extraction.successCriteria,
    confidence: extraction.confidence,
    createdAt: now,
    updatedAt: now,
  };
  return { ...state, goal, constraints: extraction.constraints, status: 'planning' };
}
