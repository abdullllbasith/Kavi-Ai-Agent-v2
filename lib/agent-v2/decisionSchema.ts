export type PlannerDecision =
  | { kind: 'act'; tool: string; reason: string; input: Record<string, unknown>; expectedOutcome?: string }
  | { kind: 'ask_user'; reason: string; question: string }
  | { kind: 'complete'; reason: string }
  | { kind: 'fail'; reason: string };

export type EvaluationDecision = { success: boolean; score: number; reason: string; missing: string[]; satisfiedCriteria: string[]; nextAction?: PlannerDecision };
const MAX_TEXT = 2000;
const MAX_INPUT_KEYS = 32;
function text(value: unknown, field: string): string { if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`); if (value.length > MAX_TEXT) throw new Error(`${field} is too long.`); return value.trim(); }
function objectInput(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Action input must be an object.'); const input = value as Record<string, unknown>; if (Object.keys(input).length > MAX_INPUT_KEYS) throw new Error('Action input contains too many fields.'); return input; }
export function validatePlannerDecision(decision: unknown, availableTools: string[]): PlannerDecision {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new Error('Planner returned an invalid decision.');
  const value = decision as Record<string, unknown>;
  if (value.kind === 'complete' || value.kind === 'fail') return { kind: value.kind, reason: text(value.reason, 'Decision reason') };
  if (value.kind === 'ask_user') return { kind: 'ask_user', reason: text(value.reason, 'Decision reason'), question: text(value.question, 'User question') };
  if (value.kind !== 'act') throw new Error('Invalid planner decision kind.');
  const tool = text(value.tool, 'Tool'); if (!availableTools.includes(tool)) throw new Error(`Planner selected unavailable tool: ${tool}`);
  return { kind: 'act', tool, reason: text(value.reason, 'Action reason'), input: objectInput(value.input), expectedOutcome: value.expectedOutcome === undefined ? undefined : text(value.expectedOutcome, 'Expected outcome') };
}
export function validateEvaluationDecision(value: unknown, availableTools: string[], requiredCriteria: string[] = []): EvaluationDecision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Evaluator returned an invalid decision.');
  const data = value as Record<string, unknown>;
  if (typeof data.success !== 'boolean') throw new Error('Evaluator success must be boolean.');
  if (typeof data.score !== 'number' || !Number.isFinite(data.score) || data.score < 0 || data.score > 1) throw new Error('Evaluator score must be between 0 and 1.');
  const reason = text(data.reason, 'Evaluation reason');
  const list = (value: unknown, field: string): string[] => Array.isArray(value) ? value.map((item) => text(item, field)) : (() => { throw new Error(`${field} must be an array.`); })();
  const missing = data.missing === undefined ? [] : list(data.missing, 'Missing evidence');
  const satisfiedCriteria = data.satisfiedCriteria === undefined ? [] : list(data.satisfiedCriteria, 'Satisfied criterion');
  const allowed = new Set(requiredCriteria);
  if (satisfiedCriteria.some((criterion) => !allowed.has(criterion))) throw new Error('Evaluator returned a criterion that is not part of the goal.');
  const complete = requiredCriteria.length > 0 && requiredCriteria.every((criterion) => satisfiedCriteria.includes(criterion)) && missing.length === 0;
  if (data.success && !complete) throw new Error('Evaluator cannot report success until every goal criterion is satisfied.');
  const nextAction = data.nextAction === null || data.nextAction === undefined ? undefined : validatePlannerDecision(data.nextAction, availableTools);
  return { success: complete, score: complete ? data.score : Math.min(data.score, 0.79), reason, missing, satisfiedCriteria, nextAction };
}
