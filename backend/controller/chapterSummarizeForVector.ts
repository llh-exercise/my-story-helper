import type { Request, Response } from 'express';
import { generateText } from 'ai';
import { readLlmConfig } from '../service/config.js';
import { createChatModel } from '../utils/chat.js';
import { getChapterById } from '../service/chapter.js';
import {
  getChapterEmbedding,
  parseSummaryFromDbJson,
  upsertChapterEmbeddingSummaryOnly,
} from '../service/chapterEmbedding.js';
import { tipTapJsonStringToPlain } from '../utils/tipTapPlainText.js';
import { chapterSummaryToSourceText } from '../utils/chapterVectorSummaryText.js';
import type { ChapterVectorSummaryPayload } from '../types/chapterTypes.js';

const SYSTEM_PROMPT = `你是网络小说编辑。用户会提供一章的正文，请你提炼结构化摘要，供后续向量检索与剧情回顾使用。
务必只输出一个 JSON 对象，不要 markdown 代码围栏、不要任何解释性前后文。
JSON 的五个键必须全部存在，键名与类型严格如下（值为字符串）：
- "characters"：出场人物（姓名或称谓及身份/关系简述）
- "plot"：关键剧情（按发生顺序简要概括）
- "powerChanges"：实力变化（境界、功法、技能、装备、资源等有则写，无则写「无」）
- "foreshadowing"：伏笔与悬念（无则写「无」）
- "locations"：地点与重要场景

措辞简洁，每条控制在合理长度内；不要编造正文中没有的内容。`;

function parseSummaryJson(text: string): ChapterVectorSummaryPayload | null {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  let slice = trimmed;
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) {
    slice = fence[1].trim();
  }
  try {
    const o = JSON.parse(slice) as Record<string, unknown>;
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

/**
 * body: { regenerate?: boolean }，默认 false：优先读库；无记录或 regenerate 为 true 时调模型并写入向量库
 */
export async function postSummarizeChapterBodyForVector(req: Request, res: Response): Promise<void> {
  try {
    const storyId = Number(req.params.storyId);
    const chapterId = Number(req.params.chapterId);
    if (!Number.isInteger(storyId) || storyId <= 0 || !Number.isInteger(chapterId) || chapterId <= 0) {
      res.status(400).json({ error: '无效的参数' });
      return;
    }

    const row = getChapterById(storyId, chapterId);
    if (!row || row.parentId == null) {
      res.status(404).json({ error: '章节不存在或不是卷下的章' });
      return;
    }

    const regenerate = Boolean((req.body as { regenerate?: unknown } | undefined)?.regenerate);

    if (!regenerate) {
      const emb = getChapterEmbedding(storyId, chapterId);
      const cached = emb ? parseSummaryFromDbJson(emb.summaryJson) : null;
      if (cached) {
        res.json({ summary: cached, cached: true });
        return;
      }
    }

    const plain = tipTapJsonStringToPlain(row.content);
    if (!plain.trim()) {
      res.status(400).json({ error: '本章正文为空，请先保存正文后再试' });
      return;
    }

    const userPrompt = `【章节标题】${row.title || '（未命名）'}\n【正文】\n${plain}`;

    const cfg = readLlmConfig();
    const model = createChatModel(cfg);
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.35,
    });

    const summary = parseSummaryJson(text ?? '');
    if (!summary) {
      res.status(502).json({ error: '模型返回无法解析为摘要 JSON，请重试' });
      return;
    }

    upsertChapterEmbeddingSummaryOnly(storyId, chapterId, summary);

    res.json({ summary, cached: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '生成本章摘要失败';
    if (!res.headersSent) {
      res.status(400).json({ error: msg });
    }
  }
}
