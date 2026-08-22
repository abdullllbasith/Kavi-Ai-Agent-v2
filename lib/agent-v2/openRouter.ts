import type { LLMStructuredCall } from './llmPlanner';

export function createOpenRouterCall(options: { apiKey: string; model: string; siteUrl?: string; siteName?: string; timeoutMs?: number }): LLMStructuredCall {
  const timeoutMs = options.timeoutMs ?? 30_000;
  return async <T>({ system, user, schema }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          ...(options.siteUrl ? { 'HTTP-Referer': options.siteUrl } : {}),
          ...(options.siteName ? { 'X-Title': options.siteName } : {}),
        },
        body: JSON.stringify({
          model: options.model,
          temperature: 0.1,
          messages: [
            { role: 'system', content: `${system}\n\nReturn ONLY valid JSON matching this schema:\n${schema}` },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!response.ok) throw new Error(`LLM provider returned HTTP ${response.status}.`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('LLM provider returned no structured content.');
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned) as T;
    } finally {
      clearTimeout(timer);
    }
  };
}
