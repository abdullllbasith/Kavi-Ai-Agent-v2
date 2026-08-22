import type { LLMStructuredCall } from './llmPlanner';

export type StructuredModelClient = {
  generateObject: <T>(input: {
    system: string;
    user: string;
    schema: string;
  }) => Promise<T>;
};

export function createStructuredLLMAdapter(client: StructuredModelClient): LLMStructuredCall {
  return async <T>(input: { system: string; user: string; schema: string }): Promise<T> => {
    return client.generateObject<T>(input);
  };
}
