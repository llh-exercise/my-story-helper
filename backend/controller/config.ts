import type { Request, Response } from 'express';
import {
  getDefaultKeyConfig,
  listLlmConfigs,
  readLlmConfigByPurpose,
  writeLlmConfigByPurpose,
} from '../service/config.js';
import type { LlmKeyConfig, LlmProvider } from '../types/index.js';
import {
  LLM_PURPOSE_GENERATE_EMBEDDING,
  LLM_PURPOSE_GENERATE_TEXT,
} from '../types/llmKeyTypes.js';

export function getConfig(_req: Request, res: Response): void {
  const items = listLlmConfigs().map((row) => ({
    purpose: row.purpose,
    provider: row.provider,
    apiBase: row.apiBase || '',
    model: row.model,
    apiKey: row.apiKey || '',
    hasApiKey: Boolean((row.apiKey || '').trim()),
    updatedAt: row.updatedAt,
  }));
  res.json({ items });
}

function parseProviderForPurpose(body: Record<string, unknown>, purpose: string): LlmProvider {
  const raw = body?.provider;
  if (purpose === LLM_PURPOSE_GENERATE_TEXT) {
    return 'deepseek';
  }
  if (raw === 'deepseek' || raw === 'dashscope') {
    return raw;
  }
  return 'dashscope';
}

export function postConfig(req: Request, res: Response): void {
  try {
    const body = req.body as Record<string, unknown> | undefined;
    const purposeRaw = typeof body?.purpose === 'string' ? body.purpose.trim() : '';
    if (purposeRaw !== LLM_PURPOSE_GENERATE_TEXT && purposeRaw !== LLM_PURPOSE_GENERATE_EMBEDDING) {
      res.status(400).json({
        error: '请指定有效的模型用途（生成文字 / 生成向量）',
      });
      return;
    }

    const prev = readLlmConfigByPurpose(purposeRaw);
    const provider = parseProviderForPurpose(body ?? {}, purposeRaw);
    const apiKey =
      typeof body?.apiKey === 'string' && body.apiKey.trim() !== ''
        ? body.apiKey.trim()
        : (prev?.apiKey || '').trim();
    const apiBase = typeof body?.apiBase === 'string' ? body.apiBase.trim() : '';
    const modelRaw = typeof body?.model === 'string' ? body.model.trim() : '';
    const defaultModel =
      purposeRaw === LLM_PURPOSE_GENERATE_EMBEDDING
        ? 'text-embedding-v3'
        : getDefaultKeyConfig().model;
    const model = modelRaw || (prev?.model || '').trim() || defaultModel;

    const next: LlmKeyConfig = {
      provider,
      apiKey,
      apiBase,
      model,
    };

    if (!next.apiKey) {
      res.status(400).json({ error: 'API Key 不能为空（首次保存必须填写）' });
      return;
    }
    if (!next.model) {
      res.status(400).json({ error: '模型不能为空' });
      return;
    }

    writeLlmConfigByPurpose(purposeRaw, next);
    res.json({
      ok: true,
      purpose: purposeRaw,
      provider: next.provider,
      apiBase: next.apiBase,
      model: next.model,
      hasApiKey: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存配置失败';
    console.error('[POST /api/config]', e);
    if (!res.headersSent) {
      res.status(500).json({ error: msg });
    }
  }
}
