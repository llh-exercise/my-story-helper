import { getDb } from '../db/index.js';
import type { ChapterVectorSummaryPayload } from '../types/chapterTypes.js';
import { chapterSummaryToSourceText } from '../utils/chapterVectorSummaryText.js';

export type ChapterEmbeddingRow = {
  id: number;
  storyId: number;
  chapterId: number;
  sourceText: string;
  /** JSON 数组字符串 */
  embeddingJson: string;
  embeddingModel: string;
  dimensions: number;
  updatedAt: number;
  /** 结构化摘要 JSON */
  summaryJson: string;
};

type RowDb = {
  id: number;
  story_id: number;
  chapter_id: number;
  source_text: string;
  embedding: string;
  embedding_model: string;
  dimensions: number;
  updated_at: number;
  summary_json: string;
};

function rowToDto(r: RowDb): ChapterEmbeddingRow {
  return {
    id: r.id,
    storyId: r.story_id,
    chapterId: r.chapter_id,
    sourceText: r.source_text,
    embeddingJson: r.embedding,
    embeddingModel: r.embedding_model,
    dimensions: r.dimensions,
    updatedAt: r.updated_at,
    summaryJson: r.summary_json ?? '',
  };
}

export function parseSummaryFromDbJson(raw: string): ChapterVectorSummaryPayload | null {
  if (!raw || !String(raw).trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const pick = (k: string) => (typeof o[k] === 'string' ? o[k] : String(o[k] ?? ''));
    return {
      characters: pick('characters'),
      plot: pick('plot'),
      powerChanges: pick('powerChanges'),
      foreshadowing: pick('foreshadowing'),
      locations: pick('locations'),
    };
  } catch {
    return null;
  }
}

/** 本故事下所有「已具备非空向量」的章节，用于 RAG 检索 */
export function listChapterEmbeddingsWithVectorsForStory(
  storyId: number,
): { chapterId: number; vec: number[] }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT chapter_id, embedding, dimensions
       FROM story_chapter_embedding
       WHERE story_id = ? AND dimensions > 0 AND embedding IS NOT NULL AND embedding != '[]'`,
    )
    .all(storyId) as { chapter_id: number; embedding: string; dimensions: number }[];

  const out: { chapterId: number; vec: number[] }[] = [];
  for (const r of rows) {
    try {
      const vec = JSON.parse(r.embedding) as unknown;
      if (!Array.isArray(vec) || vec.length === 0) continue;
      const nums = vec.map((x) => Number(x));
      if (nums.length !== r.dimensions || nums.some((n) => Number.isNaN(n))) continue;
      out.push({ chapterId: r.chapter_id, vec: nums });
    } catch {
      /* 跳过损坏行 */
    }
  }
  return out;
}

export function getChapterEmbedding(storyId: number, chapterId: number): ChapterEmbeddingRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, story_id, chapter_id, source_text, embedding, embedding_model, dimensions, updated_at,
              COALESCE(summary_json, '') AS summary_json
       FROM story_chapter_embedding WHERE story_id = ? AND chapter_id = ?`,
    )
    .get(storyId, chapterId) as RowDb | undefined;
  if (!row) return null;
  return rowToDto(row);
}

/**
 * 同一故事下每章仅保留一行：写入结构化摘要、原文；向量可先为空数组占位
 */
export function upsertChapterEmbedding(
  storyId: number,
  chapterId: number,
  payload: {
    summary: ChapterVectorSummaryPayload;
    sourceText: string;
    embedding: number[];
    embeddingModel: string;
  },
): ChapterEmbeddingRow {
  const db = getDb();
  const embStr = JSON.stringify(payload.embedding);
  const dims = payload.embedding.length;
  const summaryJson = JSON.stringify(payload.summary);
  const t = Date.now();
  db.prepare(
    `INSERT INTO story_chapter_embedding (
       story_id, chapter_id, source_text, embedding, embedding_model, dimensions, updated_at, summary_json
     ) VALUES (@story_id, @chapter_id, @source_text, @embedding, @embedding_model, @dimensions, @updated_at, @summary_json)
     ON CONFLICT(story_id, chapter_id) DO UPDATE SET
       source_text = excluded.source_text,
       embedding = excluded.embedding,
       embedding_model = excluded.embedding_model,
       dimensions = excluded.dimensions,
       updated_at = excluded.updated_at,
       summary_json = excluded.summary_json`,
  ).run({
    story_id: storyId,
    chapter_id: chapterId,
    source_text: payload.sourceText,
    embedding: embStr,
    embedding_model: payload.embeddingModel,
    dimensions: dims,
    updated_at: t,
    summary_json: summaryJson,
  });
  const row = getChapterEmbedding(storyId, chapterId);
  if (!row) throw new Error('写入向量库失败');
  return row;
}

/** 仅根据摘要更新库（占位向量）；用于用户编辑后落库 */
export function upsertChapterEmbeddingSummaryOnly(
  storyId: number,
  chapterId: number,
  summary: ChapterVectorSummaryPayload,
): ChapterEmbeddingRow {
  const sourceText = chapterSummaryToSourceText(summary);
  return upsertChapterEmbedding(storyId, chapterId, {
    summary,
    sourceText,
    embedding: [],
    embeddingModel: '',
  });
}
