import type { AgentState, AgentAction, Observation } from './types';

export type EvidencePolicy = {
  minObservationsForCompletion: number;
  requireSuccessfulAction: boolean;
};

export const DEFAULT_EVIDENCE_POLICY: EvidencePolicy = {
  minObservationsForCompletion: 1,
  requireSuccessfulAction: true,
};

export function hasSufficientEvidence(state: AgentState, policy = DEFAULT_EVIDENCE_POLICY): boolean {
  if (state.observations.length < policy.minObservationsForCompletion) return false;
  if (policy.requireSuccessfulAction && !state.actions.some((a) => a.status === 'succeeded')) return false;
  return true;
}

export function isStaleObservation(observation: Observation, maxAgeMs: number, now = Date.now()): boolean {
  const created = Date.parse(observation.createdAt);
  return !Number.isFinite(created) || now - created > maxAgeMs;
}

export function canRetryAction(action: AgentAction, maxRetries = 1): boolean {
  if (action.status !== 'failed') return false;
  return action.error ? !/authorization|forbidden|permission/i.test(action.error) : maxRetries > 0;
}

export function detectToolFailureRecovery(state: AgentState): 'retry' | 'replan' | 'ask_user' {
  const failed = state.actions.filter((a) => a.status === 'failed');
  if (!failed.length) return 'replan';
  const latest = failed.at(-1)!;
  if (canRetryAction(latest)) return 'retry';
  if (/authorization|forbidden|permission/i.test(latest.error ?? '')) return 'ask_user';
  return 'replan';
}
