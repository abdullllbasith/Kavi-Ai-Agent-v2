import type { AgentState } from './types';
import type { ToolRegistry } from './toolRegistry';
import type { PlannerDecision, EvaluationDecision } from './decisionSchema';
import { validatePlannerDecision, validateEvaluationDecision } from './decisionSchema';

export type LLMStructuredCall = <T>(input: {
  system: string;
  user: string;
  schema: string;
}) => Promise<T>;

function summarizeState(state: AgentState): string {
  return JSON.stringify({
    userMessage: state.userMessage,
    goal: state.goal,
    constraints: state.constraints,
    plan: state.plan,
    observations: state.observations.slice(-6),
    actions: state.actions.slice(-6).map((a) => ({ tool: a.tool, status: a.status, error: a.error })),
    iteration: state.iteration,
    lastEvaluation: state.lastEvaluation,
  });
}

export function createLLMPlanner(call: LLMStructuredCall) {
  return async (state: AgentState, tools: ToolRegistry): Promise<PlannerDecision> => {
    const system = `You are Kavi's planning controller. Choose exactly one next action from the available tools, ask the user when essential information is missing, or complete only when the goal is demonstrably satisfied. Never invent catalog, price, stock, delivery, or order facts. Consequential commerce tools require explicit confirmation in state. Prefer observing tool results before making strong claims. Available tools: ${tools.list().map((tool) => `${tool.name}: ${tool.description}`).join('\n')}`;
    const user = `Current agent state:\n${summarizeState(state)}\nReturn one structured planner decision.`;
    const raw = await call<unknown>({ system, user, schema: 'PlannerDecision(kind=act|ask_user|complete|fail; act requires tool, reason, input, expectedOutcome; ask_user requires question).' });
    return validatePlannerDecision(raw, tools.list().map((tool) => tool.name));
  };
}

export function createLLMEvaluator(call: LLMStructuredCall) {
  return async (state: AgentState, toolResult?: unknown): Promise<EvaluationDecision> => {
    const system = `You are Kavi's goal evaluator. Determine whether the user's goal is actually satisfied by the observed evidence. Be conservative: missing evidence is not success. If not satisfied, identify what is missing and suggest a single next action. Do not invent facts.`;
    const user = `Agent state:\n${summarizeState(state)}\nLatest tool result:\n${JSON.stringify(toolResult)}\nReturn a structured evaluation.`;
    const raw = await call<unknown>({ system, user, schema: 'EvaluationDecision(success:boolean, score:number 0..1, reason:string, missing:string[], nextAction:PlannerDecision|null)' });
    return validateEvaluationDecision(raw);
  };
}
