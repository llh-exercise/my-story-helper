import { getDb } from '../db/index.js';
import type { LlmKeyConfig, LlmProvider } from '../types/llmKeyTypes.js';
import {
  LLM_PURPOSE_GENERATE_EMBEDDING,
  LLM_PURPOSE_GENERATE_TEXT,
} from '../types/llmKeyTypes.js';

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

function normalizeProvider(raw: string): LlmProvider {
  if (raw === 'doubao') return 'doubao';
  if (raw === 'dashscope') return 'dashscope';
  return 'deepseek';
}

function rowToConfig(row: LlmConfigRow): LlmKeyConfig {
  return {
    provider: normalizeProvider(row.provider || 'deepseek'),
    apiKey: typeof row.api_key === 'string' ? row.api_key : '',
    apiBase: typeof row.api_base === 'string' ? row.api_base : '',
    model:
      typeof row.model === 'string' && row.model
        ? row.model
        : DEFAULT_CONFIG.model,
  };
}

/** 界面保存的「生成文字」配置仅允许 deepseek / doubao */
function normalizeTextConfig(cfg: LlmKeyConfig): LlmKeyConfig {
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

function upsertLlmConfigByPurpose(purpose: string, normalized: LlmKeyConfig): void {
  const db = getDb();
  const t = Date.now();
  db.prepare(
    `INSERT INTO llm_config (purpose, provider, api_key, api_base, model, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(purpose) DO UPDATE SET
       provider = excluded.provider,
       api_key = excluded.api_key,
       api_base = excluded.api_base,
       model = excluded.model,
       updated_at = excluded.updated_at`,
  ).run(
    purpose,
    normalized.provider,
    normalized.apiKey,
    normalized.apiBase,
    normalized.model,
    t,
  );
}

/** 将「生成文字」用途的配置写入 SQLite（界面模型配置） */
export function writeLlmConfig(cfg: LlmKeyConfig): void {
  const normalized = normalizeTextConfig(cfg);
  try {
    upsertLlmConfigByPurpose(LLM_PURPOSE_GENERATE_TEXT, normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`写入数据库 llm_config 失败: ${msg}`);
  }
}

/** 读取「生成文字」用途配置（对话、摘要、正文生成等） */
export function readLlmConfig(): LlmKeyConfig {
  try {
    const db = getDb();
    const row = db
      .prepare(
        'SELECT provider, api_key, api_base, model FROM llm_config WHERE purpose = ?',
      )
      .get(LLM_PURPOSE_GENERATE_TEXT) as LlmConfigRow | undefined;
    if (!row) {
      return { ...DEFAULT_CONFIG };
    }
    return rowToConfig(row);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** 读取「生成向量」用途配置（DashScope 等嵌入） */
export function readLlmConfigForEmbedding(): LlmKeyConfig {
  try {
    const db = getDb();
    const row = db
      .prepare(
        'SELECT provider, api_key, api_base, model FROM llm_config WHERE purpose = ?',
      )
      .get(LLM_PURPOSE_GENERATE_EMBEDDING) as LlmConfigRow | undefined;
    if (!row) {
      return {
        provider: 'dashscope',
        apiKey: '',
        apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'text-embedding-v3',
      };
    }
    const c = rowToConfig(row);
    const rawModel = typeof row.model === 'string' ? row.model.trim() : '';
    c.model = rawModel || 'text-embedding-v3';
    if (!c.apiBase.trim()) {
      c.apiBase = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    }
    return c;
  } catch {
    return {
      provider: 'dashscope',
      apiKey: '',
      apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'text-embedding-v3',
    };
  }
}

export function getDefaultKeyConfig(): LlmKeyConfig {
  return { ...DEFAULT_CONFIG };
}
