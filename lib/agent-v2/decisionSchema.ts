export type PlannerDecision =
  | { kind: 'act'; tool: string; reason: string; input: Record<string, unknown>; expectedOutcome?: string }
  | { kind: 'ask_user'; reason: string; question: string }
  | { kind: 'complete'; reason: string }
  | { kind: 'fail'; reason: string };

export type EvaluationDecision = {
  success: boolean;
  score: number;
  reason: string;
  missing?: string[];
  nextAction?: PlannerDecision;
};

export function validatePlannerDecision(decision: unknown, availableTools: string[]): PlannerDecision {
  if (!decision || typeof decision !== 'object') throw new Error('Planner returned an invalid decision.');
  const value = decision as Record<string, unknown>;
  const kind = value.kind;
  if (kind === 'complete' || kind === 'fail') {
    if (typeof value.reason !== 'string') throw new Error('Decision reason is required.');
    return { kind, reason: value.reason };
  }
  if (kind === 'ask_user') {
    if (typeof value.reason !== 'string' || typeof value.question !== 'string') throw new Error('User-question decision is incomplete.');
    return { kind: 'ask_user', reason: value.reason, question: value.question };
  }
  if (kind !== 'act' || typeof value.tool !== 'string' || typeof value.reason !== 'string') throw new Error('Invalid action decision.');
  if (!availableTools.includes(value.tool)) throw new Error(`Planner selected unavailable tool: ${value.tool}`);
  const input = value.input && typeof value.input === 'object' ? value.input as Record<string, unknown> : {};
  return { kind: 'act', tool: value.tool, reason: value.reason, input, expectedOutcome: typeof value.expectedOutcome === 'string' ? value.expectedOutcome : undefined };
}
