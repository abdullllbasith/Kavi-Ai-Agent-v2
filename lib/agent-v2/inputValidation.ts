export function requireRecord(input: unknown, toolName: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`${toolName}: input must be an object.`);
  return input as Record<string, unknown>;
}

export function requireString(input: Record<string, unknown>, key: string, toolName: string): string {
  const value = input[key];
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${toolName}: ${key} is required.`);
  return value.trim();
}

export function requirePositiveInteger(input: Record<string, unknown>, key: string, toolName: string, fallback = 1): number {
  const value = input[key] ?? fallback;
  if (!Number.isInteger(value) || Number(value) < 1) throw new Error(`${toolName}: ${key} must be a positive integer.`);
  return Number(value);
}

export function requireFiniteNumber(input: Record<string, unknown>, key: string, toolName: string): number {
  const value = input[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${toolName}: ${key} must be a finite number.`);
  return value;
}
