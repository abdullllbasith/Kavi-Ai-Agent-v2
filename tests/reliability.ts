import { detectToolFailureRecovery, hasSufficientEvidence, isStaleObservation } from '../lib/agent-v2/reliability.js';
import { createActionFingerprint, isConfirmationValid } from '../lib/agent-v2/confirmation.js';
import type { AgentState } from '../lib/agent-v2/types.js';

const base: AgentState = {
  turnId: 'test', status: 'evaluating', userMessage: 'test', goal: null, constraints: {}, plan: [], iteration: 1, maxIterations: 8,
  observations: [{ id: 'o1', source: 'mock', summary: 'ok', createdAt: new Date().toISOString() }],
  actions: [{ id: 'a1', tool: 'mock', reason: 'test', input: {}, status: 'succeeded' }],
};

if (!hasSufficientEvidence(base)) throw new Error('Evidence policy rejected valid observation.');
if (isStaleObservation(base.observations[0], 60_000)) throw new Error('Fresh observation marked stale.');
if (detectToolFailureRecovery({ ...base, actions: [{ ...base.actions[0], status: 'failed', error: 'temporary timeout' }] }) !== 'retry') throw new Error('Retry recovery failed.');

const confirmation = { action: 'add_to_cart', fingerprint: createActionFingerprint('add_to_cart', { productId: 'p1', quantity: 1 }), confirmedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
if (!isConfirmationValid({ ...base, constraints: { confirmation } }, 'add_to_cart', { productId: 'p1', quantity: 1 })) throw new Error('Valid confirmation rejected.');
if (isConfirmationValid({ ...base, constraints: { confirmation } }, 'add_to_cart', { productId: 'p2', quantity: 1 })) throw new Error('Mismatched confirmation accepted.');
