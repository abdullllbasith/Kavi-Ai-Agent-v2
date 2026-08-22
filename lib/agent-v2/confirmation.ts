import type { AgentState } from './types';

export type ConfirmationRecord = {
  action: string;
  fingerprint: string;
  confirmedAt: string;
  expiresAt: string;
  usedAt?: string;
};

export function createActionFingerprint(action: string, input: unknown): string {
  return `${action}:${stableStringify(input)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function isConfirmationValid(state: AgentState, action: string, input: unknown, now = Date.now()): boolean {
  const record = state.constraints.confirmation as ConfirmationRecord | undefined;
  if (!record || record.usedAt) return false;
  if (record.action !== action || record.fingerprint !== createActionFingerprint(action, input)) return false;
  const confirmed = Date.parse(record.confirmedAt);
  const expiry = Date.parse(record.expiresAt);
  return Number.isFinite(confirmed) && Number.isFinite(expiry) && expiry > now && confirmed <= now;
}

export function consumeConfirmation(state: AgentState, action: string, input: unknown, now = Date.now()): void {
  if (!isConfirmationValid(state, action, input, now)) throw new Error(`Valid confirmation required for tool ${action}.`);
  const record = state.constraints.confirmation as ConfirmationRecord;
  record.usedAt = new Date(now).toISOString();
}
