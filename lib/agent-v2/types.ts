export type AgentStatus = 'understanding' | 'planning' | 'acting' | 'evaluating' | 'waiting_for_user' | 'completed' | 'failed';
export type Goal = { id: string; objective: string; type?: string; successCriteria: string[]; confidence: number; createdAt: string; updatedAt: string };
export type Constraints = Record<string, unknown>;
export type ConfirmationState = { action: string; fingerprint: string; confirmedAt: string; expiresAt: string; usedAt?: string };
export type AgentSecurity = { userId: string; confirmation?: ConfirmationState };
export type Observation = { id: string; source: string; summary: string; data?: unknown; createdAt: string };
export type AgentAction = { id: string; tool: string; reason: string; input: unknown; expectedOutcome?: string; status: 'planned' | 'running' | 'succeeded' | 'failed'; output?: unknown; error?: string; startedAt?: string; completedAt?: string };
export type AgentState = {
  turnId: string; status: AgentStatus; userMessage: string; goal: Goal | null; constraints: Constraints; security?: AgentSecurity;
  plan: string[]; observations: Observation[]; actions: AgentAction[]; iteration: number; maxIterations: number; pendingQuestion?: string;
  lastEvaluation?: { success: boolean; score: number; reason: string; nextStep?: string };
};
export type ToolDefinition<TInput = unknown, TOutput = unknown> = { name: string; description: string; execute: (input: TInput, state: AgentState) => Promise<TOutput> };
