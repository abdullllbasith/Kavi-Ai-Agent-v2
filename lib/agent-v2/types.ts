export type AgentStatus =
  | 'understanding'
  | 'planning'
  | 'acting'
  | 'evaluating'
  | 'waiting_for_user'
  | 'completed'
  | 'failed';

export type Goal = {
  id: string;
  objective: string;
  type?: string;
  successCriteria: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type Constraints = Record<string, unknown>;

export type Observation = {
  id: string;
  source: string;
  summary: string;
  data?: unknown;
  createdAt: string;
};

export type AgentAction = {
  id: string;
  tool: string;
  reason: string;
  input: unknown;
  expectedOutcome?: string;
  status: 'planned' | 'running' | 'succeeded' | 'failed';
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type AgentState = {
  turnId: string;
  status: AgentStatus;
  userMessage: string;
  goal: Goal | null;
  constraints: Constraints;
  plan: string[];
  observations: Observation[];
  actions: AgentAction[];
  iteration: number;
  maxIterations: number;
  pendingQuestion?: string;
  lastEvaluation?: {
    success: boolean;
    score: number;
    reason: string;
    nextStep?: string;
  };
};

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  execute: (input: TInput, state: AgentState) => Promise<TOutput>;
};
