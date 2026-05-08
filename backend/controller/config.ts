import type { Request, Response } from 'express';
import { readLlmConfig, writeLlmConfig, getDefaultKeyConfig } from '../service/config.js';
import type { LlmKeyConfig, LlmProvider } from '../types/index.js';

export function getConfig(_req: Request, res: Response): void {
  const cfg = readLlmConfig();
  res.json({
    provider: cfg.provider,
    apiBase: cfg.apiBase || '',
    model: cfg.model,
    /** 明文返回，仅建议在可信环境使用 */
    apiKey: cfg.apiKey || '',
    hasApiKey: Boolean((cfg.apiKey || '').trim()),
  });
}

export function postConfig(req: Request, res: Response): void {
  try {
    const body = req.body as Record<string, unknown> | undefined;
    const prev = readLlmConfig();
    const provider = body?.provider === 'doubao' ? 'doubao' : 'deepseek';
    const apiKey =
      typeof body?.apiKey === 'string' && body.apiKey.trim() !== ''
        ? body.apiKey.trim()
        : (prev.apiKey || '').trim();
    const apiBase = typeof body?.apiBase === 'string' ? body.apiBase : '';
    const model =
      typeof body?.model === 'string' ? body.model : getDefaultKeyConfig().model;

    const next: LlmKeyConfig = {
      provider: provider as LlmProvider,
      apiKey,
      apiBase: apiBase.trim(),
      model: model.trim(),
    };

    if (!next.apiKey) {
      res.status(400).json({ error: 'API Key 不能为空（首次保存必须填写）' });
      return;
    }
    if (!next.model) {
      res.status(400).json({ error: '模型不能为空' });
      return;
    }

    writeLlmConfig(next);
    res.json({
      ok: true,
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
