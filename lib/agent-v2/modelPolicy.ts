export type ModelTask = 'planning' | 'evaluation' | 'response' | 'retrieval_query';

export type ModelPolicy = {
  temperature: number;
  maxOutputTokens: number;
  requireStructuredOutput: boolean;
};

export const MODEL_POLICIES: Record<ModelTask, ModelPolicy> = {
  planning: { temperature: 0.1, maxOutputTokens: 1200, requireStructuredOutput: true },
  evaluation: { temperature: 0, maxOutputTokens: 1000, requireStructuredOutput: true },
  response: { temperature: 0.4, maxOutputTokens: 1600, requireStructuredOutput: false },
  retrieval_query: { temperature: 0.1, maxOutputTokens: 300, requireStructuredOutput: true },
};
