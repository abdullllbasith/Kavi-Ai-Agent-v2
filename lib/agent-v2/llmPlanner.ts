import type { AgentState } from './types';
import type { ToolRegistry } from './toolRegistry';
import type { PlannerDecision, EvaluationDecision } from './decisionSchema';
import { validatePlannerDecision, validateEvaluationDecision } from './decisionSchema';

export type LLMStructuredCall = <T>(input: { system: string; user: string; schema: string }) => Promise<T>;
function summarizeState(state: AgentState): string { return JSON.stringify({ userMessage: state.userMessage, goal: state.goal, constraints: state.constraints, plan: state.plan, observations: state.observations.slice(-6), actions: state.actions.slice(-6).map((a) => ({ tool: a.tool, status: a.status, error: a.error })), iteration: state.iteration, lastEvaluation: state.lastEvaluation }); }

export function createLLMPlanner(call: LLMStructuredCall) {
  return async (state: AgentState, tools: ToolRegistry): Promise<PlannerDecision> => {
    const availableTools = tools.list().map((tool) => tool.name);
    const system = `You are Kavi's planning controller. Choose exactly one next action from the available tools, ask the user when essential information is missing, or complete only when the goal is demonstrably satisfied. Never invent catalog, price, stock, delivery, or order facts. Consequential commerce tools require explicit confirmation in state. Available tools: ${tools.list().map((tool) => `${tool.name}: ${tool.description}`).join('\n')}`;
    const raw = await call<unknown>({ system, user: `Current agent state:\n${summarizeState(state)}\nReturn one structured planner decision.`, schema: 'PlannerDecision(kind=act|ask_user|complete|fail; act requires tool, reason, input, expectedOutcome; ask_user requires question).' });
    return validatePlannerDecision(raw, availableTools);
  };
}

export function createLLMEvaluator(call: LLMStructuredCall) {
  return async (state: AgentState, toolResult: unknown, tools: ToolRegistry): Promise<EvaluationDecision> => {
    const availableTools = tools.list().map((tool) => tool.name);
    const criteria = state.goal?.successCriteria ?? [];
    const system = `You are Kavi's goal evaluator. Evaluate every goal criterion separately against observed evidence. You may report success only when every required criterion is explicitly satisfied and missing is empty. Do not infer facts that are absent from observations. If not satisfied, identify missing criteria and suggest one next action using only available tools.`;
    const user = `Agent state:\n${summarizeState(state)}\nRequired goal criteria:\n${JSON.stringify(criteria)}\nLatest tool result:\n${JSON.stringify(toolResult)}\nAvailable tools: ${availableTools.join(', ')}\nReturn a structured evaluation.`;
    const raw = await call<unknown>({ system, user, schema: 'EvaluationDecision(success:boolean, score:number 0..1, reason:string, missing:string[], satisfiedCriteria:string[], nextAction:PlannerDecision|null)' });
    return validateEvaluationDecision(raw, availableTools, criteria);
  };
}
