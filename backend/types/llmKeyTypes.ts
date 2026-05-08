export type LlmProvider = 'deepseek' | 'doubao';

export interface LlmKeyConfig {
  provider: LlmProvider;
  apiKey: string;
  apiBase: string;
  model: string;
}
