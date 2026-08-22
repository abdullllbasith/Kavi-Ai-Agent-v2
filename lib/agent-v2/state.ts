import type { AgentState, Goal, Observation, AgentAction } from './types';

export function createAgentState(userMessage: string, maxIterations = 6): AgentState {
  return {
    turnId: crypto.randomUUID(),
    status: 'understanding',
    userMessage,
    goal: null,
    constraints: {},
    plan: [],
    observations: [],
    actions: [],
    iteration: 0,
    maxIterations,
  };
}

export function setGoal(state: AgentState, goal: Goal): AgentState {
  return { ...state, goal };
}

export function addObservation(state: AgentState, observation: Observation): AgentState {
  return { ...state, observations: [...state.observations, observation] };
}

export function addAction(state: AgentState, action: AgentAction): AgentState {
  return { ...state, actions: [...state.actions, action] };
}
