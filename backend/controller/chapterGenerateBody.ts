/**
 * 根据细纲生成本章正文（RAG + OpenAI 兼容 DeepSeek）
 *
 * 流程概要：
 * 1. 解析路由参数与请求体中的本章细纲草稿（若有则优先于库中细纲）。
 * 2. 拉取 RAG 上下文：故事总纲、卷细纲、当前章细纲、同卷前后各至多 5 章细纲，并计算「邻居章」id 集合。
 * 3. 将当前章细纲向量化，在本作向量库中做相似检索；检索池已排除邻居章（邻居只用细纲约束，避免与向量正文掐架）。
 * 4. 将向量命中的章节的正文（TipTap→纯文本）截断后拼进 user prompt。
 * 5. 使用 OpenAI SDK 调 DeepSeek chat.completions 生成正文。
 */
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { listChapterEmbeddingsWithVectorsForStory } from '../service/chapterEmbedding.js';
import { getChapterById, getChapterRagBundle } from '../service/chapter.js';
import { readLlmConfig } from '../service/config.js';
import type { LlmKeyConfig } from '../types/llmKeyTypes.js';
import { tipTapJsonStringToPlain } from '../utils/tipTapPlainText.js';
import { topKSimilarByEmbedding } from '../utils/vectorSimilarity.js';
import { generateEmbedding } from '../utils/generateEmbedding.js';
import {
  SYSTEM_PROMPT,
  buildRagChapterBodyUserPrompt,
  type VectorRetrievedSnip,
} from './chapterGenerateBodyShared.js';

/** 向量检索返回的参考章节数量上限（不含已排除的邻居章） */
const RAG_TOP_K = 6;

/** 与界面「模型配置」一致：DeepSeek OpenAI 兼容 baseURL + apiKey */
function createDeepSeekOpenAIClient(cfg: LlmKeyConfig): OpenAI {
  const key = (cfg.apiKey || '').trim();
  if (!key) {
    throw new Error('请先在「模型配置」中填写 API Key 并保存');
  }
  const base = ((cfg.apiBase || '').trim() || 'https://api.deepseek.com').replace(/\/$/, '');
  return new OpenAI({
    baseURL: base,
    apiKey: key,
  });
}

/**
 * POST /api/story/:storyId/chapters/:chapterId/generate-body-from-outline
 * body 可选 { chapterOutline: string } 作为本章细纲草稿。
 */
export async function postGenerateChapterBodyFromOutline(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storyId = Number(req.params.storyId);
    const chapterId = Number(req.params.chapterId);
    if (!Number.isInteger(storyId) || storyId <= 0 || !Number.isInteger(chapterId) || chapterId <= 0) {
      res.status(400).json({ error: '无效的参数' });
      return;
    }

    const rawDraft = req.body?.chapterOutline;
    const chapterOutlineDraft = typeof rawDraft === 'string' ? rawDraft : undefined;

    // 同卷目录 + 前后 5 章窗口 + 邻居 id（用于从向量候选中剔除）
    const bundle = getChapterRagBundle(storyId, chapterId, chapterOutlineDraft);
    if (!bundle) {
      res.status(404).json({ error: '章节不存在或不是卷下的章' });
      return;
    }

    const cfg = readLlmConfig();
    if (cfg.provider !== 'deepseek') {
      res.status(400).json({ error: '当前仅支持 DeepSeek 通过 OpenAI 兼容接口生成正文' });
      return;
    }

    const modelId = (cfg.model || '').trim();
    if (!modelId) {
      res.status(400).json({ error: '请先在模型配置中选择或填写模型' });
      return;
    }

    // ---------- RAG：细纲向量 → 相似章 → 拉正文 ----------
    let retrieved: VectorRetrievedSnip[] = [];
    const outlineForVec = bundle.currentChapterOutline.trim();
    if (outlineForVec) {
      // 查询向量：与库里「章节摘要」嵌入空间可能不完全一致，属已知折中
      const queryVec = await generateEmbedding(outlineForVec);
      const candidates = listChapterEmbeddingsWithVectorsForStory(storyId);
      const ranked = topKSimilarByEmbedding(
        queryVec,
        candidates,
        bundle.neighborChapterIds,
        RAG_TOP_K,
      );
      for (const { chapterId: cid, score } of ranked) {
        const ch = getChapterById(storyId, cid);
        if (!ch || ch.parentId == null) continue;
        const plain = tipTapJsonStringToPlain(ch.content);
        if (!plain.trim()) continue;
        retrieved.push({ title: ch.title, plainText: plain, score });
      }
    }

    const userPrompt = buildRagChapterBodyUserPrompt(bundle, retrieved);

    const client = createDeepSeekOpenAIClient(cfg);
    const deepseekOptions = {
      thinking: { type: 'enabled' as const },
      reasoning_effort: 'high' as const,
    };

    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.65,
      stream: false,
      ...deepseekOptions,
    });

    const raw = completion.choices[0]?.message?.content;
    const content = typeof raw === 'string' ? raw.trim() : '';
    if (!content) {
      res.status(502).json({ error: '模型未返回正文' });
      return;
    }
    res.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '生成正文失败';
    if (!res.headersSent) {
      res.status(400).json({ error: msg });
    }
  }
}
