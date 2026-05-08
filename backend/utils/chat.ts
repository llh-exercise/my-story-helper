import { createDeepSeek } from '@ai-sdk/deepseek';
import type { LanguageModel } from 'ai';
import type { LlmKeyConfig } from '../types/llmKeyTypes.js';

/**
 * 根据配置创建 AI SDK 对话模型（DeepSeek / 豆包 OpenAI 兼容端点）
 */
export function createChatModel(cfg: LlmKeyConfig): LanguageModel {
  const key = (cfg.apiKey || '').trim();
  if (!key) {
    throw new Error('请先在「模型配置」中填写 API Key 并保存');
  }
  const modelId = (cfg.model || '').trim();
  if (!modelId) {
    throw new Error('请选择或填写模型');
  }

  if (cfg.provider === 'deepseek') {
    const base = (cfg.apiBase || '').trim();
    const ds = createDeepSeek({
      apiKey: key,
      ...(base ? { baseURL: base.replace(/\/$/, '') } : {}),
    });
    return ds.chat(modelId);
  }

  throw new Error(`不支持的提供商: ${cfg.provider}`);
}
