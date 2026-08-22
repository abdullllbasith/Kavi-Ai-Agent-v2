import type { AgentState } from './types';

export type ConfirmationRecord = {
  action: string;
  fingerprint: string;
  confirmedAt: string;
  expiresAt: string;
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
  if (!record) return false;
  if (record.action !== action) return false;
  if (record.fingerprint !== createActionFingerprint(action, input)) return false;
  const expiry = Date.parse(record.expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}
