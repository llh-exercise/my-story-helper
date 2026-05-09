import OpenAI from 'openai';

/**
 * 通义千问 DashScope OpenAI 兼容模式（嵌入）。
 * 安全提示：不要把真实 Key 提交到公开 Git；上线请改用环境变量并在控制台轮换已暴露的 Key。
 */
const DASHSCOPE_API_KEY = 'sk-e60040589b5440cf8da858428719e593';

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/** DashScope 兼容模式的文本向量模型（与控制台开通的模型名一致，可按需调整） */
const DASHSCOPE_EMBEDDING_MODEL = 'text-embedding-v3';

let dashScopeClient: OpenAI | null = null;

function getDashScopeOpenAI(): OpenAI {
  if (!dashScopeClient) {
    dashScopeClient = new OpenAI({
      apiKey: DASHSCOPE_API_KEY,
      baseURL: DASHSCOPE_BASE_URL,
    });
  }
  return dashScopeClient;
}

/**
 * 使用千问 DashScope 兼容 `/v1/embeddings` 生成向量（与 chat 示例同一套 OpenAI 客户端配置）。
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = (text ?? '').trim();
  if (!input) {
    throw new Error('嵌入文本不能为空');
  }

  const openai = getDashScopeOpenAI();
  const res = await openai.embeddings.create({
    model: DASHSCOPE_EMBEDDING_MODEL,
    input,
  });

  const emb = res.data[0]?.embedding;
  if (!Array.isArray(emb) || emb.length === 0) {
    throw new Error('Embeddings 响应中缺少向量');
  }
  return emb;
}

/** 入库时记录的嵌入模型名 */
export const EMBEDDING_MODEL_ID = DASHSCOPE_EMBEDDING_MODEL;
