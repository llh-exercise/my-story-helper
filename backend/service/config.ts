import { getDb } from '../db/index.js';
import type { LlmKeyConfig, LlmProvider } from '../types/llmKeyTypes.js';

const DEFAULT_CONFIG: LlmKeyConfig = {
  provider: 'deepseek',
  apiKey: '',
  apiBase: '',
  model: 'deepseek-chat',
};

type LlmConfigRow = {
  provider: string;
  api_key: string;
  api_base: string;
  model: string;
};

function normalizeConfig(cfg: LlmKeyConfig): LlmKeyConfig {
  const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey : '';
  const apiBase = typeof cfg.apiBase === 'string' ? cfg.apiBase : '';
  const model = typeof cfg.model === 'string' ? cfg.model : '';
  return {
    provider: cfg.provider === 'doubao' ? 'doubao' : 'deepseek',
    apiKey: apiKey.trim(),
    apiBase: apiBase.trim(),
    model: model.trim(),
  };
}

function upsertLlmConfig(normalized: LlmKeyConfig): void {
  const db = getDb();
  const t = Date.now();
  db.prepare(
    `INSERT INTO llm_config (id, provider, api_key, api_base, model, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       provider = excluded.provider,
       api_key = excluded.api_key,
       api_base = excluded.api_base,
       model = excluded.model,
       updated_at = excluded.updated_at`
  ).run(
    normalized.provider,
    normalized.apiKey,
    normalized.apiBase,
    normalized.model,
    t
  );
}

/** 将大模型配置写入 SQLite（llm_config 表，id=1） */
export function writeLlmConfig(cfg: LlmKeyConfig): void {
  const normalized = normalizeConfig(cfg);
  try {
    upsertLlmConfig(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`写入数据库 llm_config 失败: ${msg}`);
  }
}

/** 从 SQLite 读取配置；无行或损坏时返回默认 */
export function readLlmConfig(): LlmKeyConfig {
  try {
    const db = getDb();
    const row = db
      .prepare(
        'SELECT provider, api_key, api_base, model FROM llm_config WHERE id = 1'
      )
      .get() as LlmConfigRow | undefined;
    if (!row) {
      return { ...DEFAULT_CONFIG };
    }
    return {
      provider: (row.provider === 'doubao' ? 'doubao' : 'deepseek') as LlmProvider,
      apiKey: typeof row.api_key === 'string' ? row.api_key : '',
      apiBase: typeof row.api_base === 'string' ? row.api_base : '',
      model:
        typeof row.model === 'string' && row.model
          ? row.model
          : DEFAULT_CONFIG.model,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function getDefaultKeyConfig(): LlmKeyConfig {
  return { ...DEFAULT_CONFIG };
}
