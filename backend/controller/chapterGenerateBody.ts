import type { Request, Response } from 'express';
import { generateText } from 'ai';
import { readLlmConfig } from '../service/config.js';
import { createChatModel } from '../utils/chat.js';
import { getChapterGenerationContext, type ChapterGenerationContext } from '../service/chapter.js';

const SYSTEM_PROMPT = `你是一位资深网络小说作者，擅长根据大纲写出连贯、有画面感的章节正文。
请严格遵守用户给出的故事总纲、卷细纲与章细纲，不要编造与细纲冲突的关键情节。
只输出小说正文本身，不要输出任何前导语、标题行（如「第一章」）、结束语或解释说明。`;

function buildUserPrompt(ctx: ChapterGenerationContext): string {
  const lines: string[] = [];
  lines.push(`【故事标题】${ctx.storyTitle}`);
  lines.push(`【故事总纲】\n${ctx.storyOutline || '（未填写）'}`);
  lines.push(`【当前卷】${ctx.volumeTitle}`);
  lines.push(`【卷细纲】\n${ctx.volumeOutline || '（未填写）'}`);
  lines.push('【本卷内：按顺序列出本章及之前各章的细纲】');
  for (const item of ctx.chapterOutlinesTrail) {
    const mark = item.isCurrent ? ' ← 请为本章撰写正文' : '';
    lines.push(`《${item.title}》${mark}`);
    lines.push(`细纲：${item.outline || '（未填写）'}`);
    lines.push('');
  }
  lines.push(
    `请根据以上内容，撰写《${ctx.currentChapterTitle}》的完整正文。\n` +
      '段落之间使用空行分隔；语言自然、适合在线阅读。',
  );
  return lines.join('\n');
}

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

    const ctx = getChapterGenerationContext(storyId, chapterId, chapterOutlineDraft);
    if (!ctx) {
      res.status(404).json({ error: '章节不存在或不是卷下的章' });
      return;
    }

    const cfg = readLlmConfig();
    const model = createChatModel(cfg);
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(ctx),
      temperature: 0.65,
    });

    const content = (text ?? '').trim();
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
