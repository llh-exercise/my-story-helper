import OpenAI from 'openai';
import { readLlmConfigForEmbedding } from '../service/config.js';

let cached: { key: string; base: string; client: OpenAI } | null = null;

function getEmbeddingOpenAI(): OpenAI {
  const cfg = readLlmConfigForEmbedding();
  const key = cfg.apiKey.trim();
  const base = (cfg.apiBase || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(
    /\/$/,
    '',
  );
  if (!key) {
    throw new Error(
      '未配置「生成向量」用途的 API Key：请在数据库表 llm_config 中填写 purpose=生成向量 的 api_key，或联系管理员初始化。',
    );
  }
  if (!cached || cached.key !== key || cached.base !== base) {
    cached = {
      key,
      base,
      client: new OpenAI({ apiKey: key, baseURL: base }),
    };
  }
  return cached.client;
}

/**
 * 使用 llm_config 中 purpose=「生成向量」的 baseURL/model/apiKey（如 DashScope 兼容 /v1/embeddings）生成向量。
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = (text ?? '').trim();
  if (!input) {
    throw new Error('嵌入文本不能为空');
  }

  const cfg = readLlmConfigForEmbedding();
  const model =
    (cfg.model || '').trim() || 'text-embedding-v3';

  const openai = getEmbeddingOpenAI();
  const res = await openai.embeddings.create({
    model,
    input,
  });

  const emb = res.data[0]?.embedding;
  if (!Array.isArray(emb) || emb.length === 0) {
    throw new Error('Embeddings 响应中缺少向量');
  }
  return emb;
}
