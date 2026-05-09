import type { Request, Response } from 'express';
import { getChapterById } from '../service/chapter.js';
import { upsertChapterEmbedding } from '../service/chapterEmbedding.js';
import type { ChapterVectorSummaryPayload } from '../types/chapterTypes.js';
import { chapterSummaryToSourceText } from '../utils/chapterVectorSummaryText.js';
import { EMBEDDING_MODEL_ID, generateEmbedding } from '../utils/generateEmbedding.js';

type SummaryBody = {
  characters?: unknown;
  plot?: unknown;
  powerChanges?: unknown;
  foreshadowing?: unknown;
  locations?: unknown;
};

function normalizeSummary(body: unknown): ChapterVectorSummaryPayload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as SummaryBody;
  const pick = (k: keyof SummaryBody) =>
    typeof b[k] === 'string' ? b[k] : b[k] != null ? String(b[k]) : '';
  const summary = {
    characters: pick('characters'),
    plot: pick('plot'),
    powerChanges: pick('powerChanges'),
    foreshadowing: pick('foreshadowing'),
    locations: pick('locations'),
  };
  const joined = Object.values(summary).join('').trim();
  if (!joined) return null;
  return summary;
}

/**
 * POST body: { summary }，写入摘要并通过阿里云 DashScope（千问兼容模式）Embeddings 生成向量后入库
 */
export async function postSaveChapterEmbedding(req: Request, res: Response): Promise<void> {
  try {
    const storyId = Number(req.params.storyId);
    const chapterId = Number(req.params.chapterId);
    if (!Number.isInteger(storyId) || storyId <= 0 || !Number.isInteger(chapterId) || chapterId <= 0) {
      res.status(400).json({ error: '无效的参数' });
      return;
    }

    const ch = getChapterById(storyId, chapterId);
    if (!ch || ch.parentId == null) {
      res.status(404).json({ error: '章节不存在或不是卷下的章' });
      return;
    }

    const rawSummary = (req.body as { summary?: unknown })?.summary;
    const summary = normalizeSummary(rawSummary);
    if (!summary) {
      res.status(400).json({ error: '请提供非空的 summary' });
      return;
    }

    const sourceText = chapterSummaryToSourceText(summary);
    if (!sourceText.trim()) {
      res.status(400).json({ error: '摘要拼接后为空，无法嵌入' });
      return;
    }

    const embedding = await generateEmbedding(sourceText);
    const saved = upsertChapterEmbedding(storyId, chapterId, {
      summary,
      sourceText,
      embedding,
      embeddingModel: EMBEDDING_MODEL_ID,
    });

    res.json({
      ok: true,
      id: saved.id,
      dimensions: saved.dimensions,
      embeddingModel: saved.embeddingModel,
      updatedAt: saved.updatedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败';
    if (!res.headersSent) {
      res.status(400).json({ error: msg });
    }
  }
}
