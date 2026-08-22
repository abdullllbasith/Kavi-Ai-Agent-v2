export type SupportedLanguage = 'en' | 'si' | 'ta' | 'tanglish';

export function detectLanguage(message: string): SupportedLanguage {
  if (/[඀-෿]/.test(message)) return 'si';
  if (/[஀-௿]/.test(message)) return 'ta';
  const lower = message.toLowerCase();
  if (/\b(ennaku|venum|irukku|epdi|illa|pannunga)\b/.test(lower)) return 'tanglish';
  return 'en';
}

export type ResponseContext = {
  language: SupportedLanguage;
  concise?: boolean;
  groundedSources?: string[];
};

export function buildResponsePolicy(context: ResponseContext): string {
  const languageInstruction = {
    en: 'Respond in clear English.',
    si: 'Respond naturally in Sinhala unless the user asks for another language.',
    ta: 'Respond naturally in Tamil unless the user asks for another language.',
    tanglish: 'Respond naturally in the user\'s Tanglish style without forcing formal Tamil.',
  }[context.language];
  const grounding = context.groundedSources?.length
    ? `Use only claims supported by these sources when discussing retrieved knowledge: ${context.groundedSources.join(', ')}.`
    : 'Do not invent catalog facts, prices, stock, delivery dates, or order states.';
  return `${languageInstruction} ${grounding}`;
}
