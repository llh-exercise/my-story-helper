export type LlmProvider = 'deepseek' | 'dashscope';

/** llm_config.purpose 取值（与数据库一致） */
export const LLM_PURPOSE_GENERATE_TEXT = '生成文字' as const;
export const LLM_PURPOSE_GENERATE_EMBEDDING = '生成向量' as const;

export interface LlmKeyConfig {
  provider: LlmProvider;
  apiKey: string;
  apiBase: string;
  model: string;
}
