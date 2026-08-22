import type { AgentState, ToolDefinition } from './types';
import { asRecord } from './inputValidation';

export type ToolSecurityPolicy = {
  requiresConfirmation?: boolean;
  authorize?: (input: unknown, state: AgentState) => Promise<boolean> | boolean;
  validate?: (input: unknown, state: AgentState) => void;
};

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly policies = new Map<string, ToolSecurityPolicy>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>, policy: ToolSecurityPolicy = {}): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool as ToolDefinition);
    this.policies.set(tool.name, policy);
  }

  get(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool;
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  async execute(name: string, input: unknown, state: AgentState): Promise<unknown> {
    const tool = this.get(name);
    const policy = this.policies.get(name) ?? {};

    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error(`Invalid input for tool ${name}: expected an object.`);
    }
    asRecord(input, `${name} input`);

    if (policy.validate) policy.validate(input, state);
    if (policy.requiresConfirmation && state.constraints.confirmed !== true) {
      throw new Error(`Explicit confirmation required for tool ${name}.`);
    }
    if (policy.authorize && !(await policy.authorize(input, state))) {
      throw new Error(`Tool authorization denied: ${name}.`);
    }

    return tool.execute(input, state);
  }
}
