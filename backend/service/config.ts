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

const DEFAULT_EMBEDDING_CONFIG: LlmKeyConfig = {
  provider: 'dashscope',
  apiKey: '',
  apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'text-embedding-v3',
};

type LlmConfigRow = {
  provider: string;
  api_key: string;
  api_base: string;
  model: string;
};

function normalizeProvider(raw: string): LlmProvider {
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

/** 按库中行与用途还原配置（嵌入行模型/基址有空串时的默认） */
function rowToConfigForPurpose(row: LlmConfigRow, purpose: string): LlmKeyConfig {
  if (purpose === LLM_PURPOSE_GENERATE_EMBEDDING) {
    const c = rowToConfig(row);
    const rawModel = typeof row.model === 'string' ? row.model.trim() : '';
    c.model = rawModel || DEFAULT_EMBEDDING_CONFIG.model;
    if (!c.apiBase.trim()) {
      c.apiBase = DEFAULT_EMBEDDING_CONFIG.apiBase;
    }
    return c;
  }
  return rowToConfig(row);
}

/** 界面保存的「生成文字」配置仅使用 DeepSeek */
function normalizeTextConfig(cfg: LlmKeyConfig): LlmKeyConfig {
  const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey : '';
  const apiBase = typeof cfg.apiBase === 'string' ? cfg.apiBase : '';
  const model = typeof cfg.model === 'string' ? cfg.model : '';
  return {
    provider: 'deepseek',
    apiKey: apiKey.trim(),
    apiBase: apiBase.trim(),
    model: model.trim(),
  };
}

/** 「生成向量」行：兼容 OpenAI 式 Embeddings 的多服务商 */
function normalizeEmbeddingRowConfig(cfg: LlmKeyConfig): LlmKeyConfig {
  const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey : '';
  const apiBase = typeof cfg.apiBase === 'string' ? cfg.apiBase : '';
  const model = typeof cfg.model === 'string' ? cfg.model : '';
  let provider = normalizeProvider(cfg.provider);
  if (provider !== 'dashscope' && provider !== 'deepseek') {
    provider = 'dashscope';
  }
  return {
    provider,
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

/** 按用途读取 llm_config 一行；用途非法或不存在返回 null */
export function readLlmConfigByPurpose(purpose: string): LlmKeyConfig | null {
  if (purpose !== LLM_PURPOSE_GENERATE_TEXT && purpose !== LLM_PURPOSE_GENERATE_EMBEDDING) {
    return null;
  }
  try {
    const row = getDb()
      .prepare(
        'SELECT provider, api_key, api_base, model FROM llm_config WHERE purpose = ?',
      )
      .get(purpose) as LlmConfigRow | undefined;
    if (!row) return null;
    return rowToConfigForPurpose(row, purpose);
  } catch {
    return null;
  }
}

/** 列出全部用途配置（管理界面） */
export function listLlmConfigs(): Array<LlmKeyConfig & { purpose: string; updatedAt: number }> {
  try {
    type Row = LlmConfigRow & { purpose: string; updated_at: number };
    const rows = getDb()
      .prepare(
        `SELECT purpose, provider, api_key, api_base, model, updated_at FROM llm_config ORDER BY purpose`,
      )
      .all() as Row[];
    return rows.map((r) => {
      const baseRow: LlmConfigRow = {
        provider: r.provider,
        api_key: r.api_key,
        api_base: r.api_base,
        model: r.model,
      };
      const cfg = rowToConfigForPurpose(baseRow, r.purpose);
      return {
        purpose: r.purpose,
        ...cfg,
        updatedAt: r.updated_at,
      };
    });
  } catch {
    return [];
  }
}

/** 按用途写入（需在 controller 校验 purpose 为枚举值） */
export function writeLlmConfigByPurpose(purpose: string, cfg: LlmKeyConfig): void {
  if (purpose !== LLM_PURPOSE_GENERATE_TEXT && purpose !== LLM_PURPOSE_GENERATE_EMBEDDING) {
    throw new Error('无效的模型用途');
  }
  const normalized =
    purpose === LLM_PURPOSE_GENERATE_TEXT
      ? normalizeTextConfig(cfg)
      : normalizeEmbeddingRowConfig(cfg);
  upsertLlmConfigByPurpose(purpose, normalized);
}

/** 将「生成文字」用途的配置写入 SQLite（兼容旧调用） */
export function writeLlmConfig(cfg: LlmKeyConfig): void {
  try {
    writeLlmConfigByPurpose(LLM_PURPOSE_GENERATE_TEXT, cfg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`写入数据库 llm_config 失败: ${msg}`);
  }
}

/** 读取「生成文字」用途配置（对话、摘要、正文生成等） */
export function readLlmConfig(): LlmKeyConfig {
  try {
    return readLlmConfigByPurpose(LLM_PURPOSE_GENERATE_TEXT) ?? { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** 读取「生成向量」用途配置（DashScope 等嵌入） */
export function readLlmConfigForEmbedding(): LlmKeyConfig {
  try {
    return readLlmConfigByPurpose(LLM_PURPOSE_GENERATE_EMBEDDING) ?? { ...DEFAULT_EMBEDDING_CONFIG };
  } catch {
    return { ...DEFAULT_EMBEDDING_CONFIG };
  }
}

export function getDefaultKeyConfig(): LlmKeyConfig {
  return { ...DEFAULT_CONFIG };
}
