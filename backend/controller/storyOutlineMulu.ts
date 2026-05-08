import type { Request, Response } from 'express';
import { generateText } from 'ai';
import { readLlmConfig } from '../service/config.js';
import { createChatModel } from '../utils/chat.js';
import { replaceMuluFromGeneratedOutline, type GeneratedVolumePayload } from '../service/chapter.js';
import { getStoryById } from '../service/story.js';

const SYSTEM_PROMPT = `你是网络小说编辑。用户给出「故事总纲」，请根据总纲设计卷与章的目录。

【重要】你的回复只能是 JSON，不要 markdown 代码块，不要任何其它文字或解释。

JSON 结构（字段名必须一致）：
{"volumes":[{"title":"卷名","outline":"本卷概要，可空字符串","chapters":[{"title":"章标题","outline":"本章概要，可空字符串"}]}]}

规则：
- 至少包含 1 个 volume；每个 volume 至少包含 1 个 chapter。
- title 必须为非空字符串；outline 可为空字符串或可省略（省略时视为空）。`;

function extractJsonObject(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(s);
  if (fence) {
    s = fence[1].trim();
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型返回中未找到 JSON 对象');
  }
  return s.slice(start, end + 1);
}

function normalizeMuluPayload(j: unknown): { volumes: GeneratedVolumePayload[] } {
  if (!j || typeof j !== 'object') {
    throw new Error('无效 JSON：须为对象');
  }
  const volumesRaw = (j as { volumes?: unknown }).volumes;
  if (!Array.isArray(volumesRaw) || volumesRaw.length === 0) {
    throw new Error('JSON 须包含非空 volumes 数组');
  }
  const volumes: GeneratedVolumePayload[] = [];
  for (const v of volumesRaw) {
    if (!v || typeof v !== 'object') {
      continue;
    }
    const vo = v as { title?: unknown; outline?: unknown; chapters?: unknown };
    const title = typeof vo.title === 'string' ? vo.title.trim() : '';
    if (!title) {
      continue;
    }
    const outline = typeof vo.outline === 'string' ? vo.outline.trim() : '';
    const chaptersRaw = vo.chapters;
    const chapters: { title: string; outline: string }[] = [];
    if (Array.isArray(chaptersRaw)) {
      for (const c of chaptersRaw) {
        if (!c || typeof c !== 'object') {
          continue;
        }
        const co = c as { title?: unknown; outline?: unknown };
        const ct = typeof co.title === 'string' ? co.title.trim() : '';
        if (!ct) {
          continue;
        }
        chapters.push({
          title: ct,
          outline: typeof co.outline === 'string' ? co.outline.trim() : '',
        });
      }
    }
    if (chapters.length === 0) {
      chapters.push({ title: '待展开', outline: '' });
    }
    volumes.push({ title, outline, chapters });
  }
  if (volumes.length === 0) {
    throw new Error('未解析到任何有效卷');
  }
  return { volumes };
}

/**
 * 根据总纲调用 DeepSeek 生成 JSON 目录，校验后写入 story_chapter
 */
export async function postOutlineGenerateMulu(req: Request, res: Response): Promise<void> {
  try {
    const storyId = Number(req.params.storyId);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      res.status(400).json({ error: '无效的故事 id' });
      return;
    }
    if (!getStoryById(storyId)) {
      res.status(404).json({ error: '故事不存在' });
      return;
    }
    const outline =
      req.body && typeof req.body.outline === 'string' ? req.body.outline.trim() : '';
    if (!outline) {
      res.status(400).json({ error: '总纲不能为空，请先填写或粘贴总纲' });
      return;
    }

    const cfg = readLlmConfig();
    const model = createChatModel(cfg);
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `以下为故事总纲，请输出符合要求的 JSON：\n\n${outline}`,
      temperature: 0.2,
    });
    if (!text || !text.trim()) {
      res.status(502).json({ error: '模型未返回内容' });
      return;
    }
    const jsonStr = extractJsonObject(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr) as unknown;
    } catch {
      res.status(502).json({ error: '模型返回不是合法 JSON' });
      return;
    }
    const payload = normalizeMuluPayload(parsed);
    replaceMuluFromGeneratedOutline(storyId, payload);
    res.json({
      ok: true,
      volumesCreated: payload.volumes.length,
      chaptersCreated: payload.volumes.reduce((n, v) => n + v.chapters.length, 0),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '生成目录失败';
    if (!res.headersSent) {
      res.status(400).json({ error: msg });
    }
  }
}
