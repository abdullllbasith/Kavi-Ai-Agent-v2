import type { AgentState, AgentAction, Observation } from './types';
import { ToolRegistry } from './toolRegistry';

export type AgentDecision = {
  kind: 'act' | 'ask_user' | 'complete' | 'fail';
  tool?: string;
  reason: string;
  input?: unknown;
  expectedOutcome?: string;
  question?: string;
};

export type AgentController = {
  plan: (state: AgentState, tools: ToolRegistry) => Promise<AgentDecision>;
  evaluate: (state: AgentState, result?: unknown) => Promise<AgentDecision>;
};

export async function runAgentLoop(initialState: AgentState, tools: ToolRegistry, controller: AgentController): Promise<AgentState> {
  let state = initialState;

  for (let i = 0; i < state.maxIterations; i += 1) {
    state = { ...state, iteration: i + 1, status: 'planning' };
    let decision: AgentDecision;
    try {
      decision = await controller.plan(state, tools);
    } catch (error) {
      return { ...state, status: 'failed', lastEvaluation: { success: false, score: 0, reason: error instanceof Error ? error.message : String(error) } };
    }

    if (decision.kind === 'ask_user') return { ...state, status: 'waiting_for_user', pendingQuestion: decision.question };
    if (decision.kind === 'complete') return { ...state, status: 'completed' };
    if (decision.kind === 'fail' || !decision.tool) return { ...state, status: 'failed' };

    const action: AgentAction = {
      id: crypto.randomUUID(), tool: decision.tool, reason: decision.reason,
      input: decision.input ?? {}, expectedOutcome: decision.expectedOutcome,
      status: 'running', startedAt: new Date().toISOString(),
    };
    state = { ...state, status: 'acting', actions: [...state.actions, action] };

    try {
      const output = await tools.execute(decision.tool, decision.input ?? {}, state);
      const observation: Observation = {
        id: crypto.randomUUID(), source: decision.tool,
        summary: 'Tool execution completed.', data: output, createdAt: new Date().toISOString(),
      };
      state = {
        ...state, status: 'evaluating', observations: [...state.observations, observation],
        actions: state.actions.map((item) => item.id === action.id
          ? { ...item, status: 'succeeded', output, completedAt: new Date().toISOString() }
          : item),
      };

      const evaluation = await controller.evaluate(state, output);
      state = {
        ...state,
        lastEvaluation: {
          success: evaluation.kind === 'complete',
          score: evaluation.kind === 'complete' ? 1 : 0,
          reason: evaluation.reason,
          nextStep: evaluation.tool,
        },
      };
      if (evaluation.kind === 'complete') return { ...state, status: 'completed' };
      if (evaluation.kind === 'ask_user') return { ...state, status: 'waiting_for_user', pendingQuestion: evaluation.question };
    } catch (error) {
      state = {
        ...state, status: 'evaluating',
        actions: state.actions.map((item) => item.id === action.id
          ? { ...item, status: 'failed', error: error instanceof Error ? error.message : String(error), completedAt: new Date().toISOString() }
          : item),
        lastEvaluation: { success: false, score: 0, reason: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  return { ...state, status: 'failed', lastEvaluation: { success: false, score: 0, reason: 'Agent iteration budget exhausted.' } };
}
