import type { ChapterRagBundle } from '../service/chapter.js';

/**
 * 发给模型的系统角色说明：约束产出仅为正文，且明文规定「细纲优先于向量检索正文」。
 */
export const SYSTEM_PROMPT = `你是一位资深网络小说作者，擅长根据大纲写出连贯、有画面感的章节正文。
请严格遵守用户给出的故事总纲、卷细纲与章细纲，不要编造与细纲冲突的关键情节。
若同时提供「向量检索到的参考正文」与同卷前后章的细纲，当二者涉及同一剧情或同一章节时，必须以细纲为准，丢弃与细纲矛盾的参考正文信息，参考正文仅可作行文风格与局部细节的辅助。
只输出小说正文本身，不要输出任何前导语、标题行（如「第一章」）、结束语或解释说明。`;

/** 一条向量检索到的参考：章标题、纯文本正文、余弦相似度得分 */
export type VectorRetrievedSnip = { title: string; plainText: string; score: number };

/** 单章参考正文注入提示词时的最大字符数，防止撑爆上下文 */
const MAX_REFERENCE_CHARS = 4500;

/**
 * 当前使用的 RAG user 提示词拼装：
 * - 固定块：故事总纲、卷名与卷细纲、当前写作章细纲；
 * - 窗口块：同卷当前章之前/之后至多 5 章的细纲（便于衔接待写章）；
 * - 可选块：向量检索命中的他章正文节选（已在控制器侧排除邻居章）。
 */
export function buildRagChapterBodyUserPrompt(
  bundle: ChapterRagBundle,
  retrieved: VectorRetrievedSnip[],
): string {
  const lines: string[] = [];
  lines.push(`【故事标题】${bundle.storyTitle}`);
  lines.push(`【故事总纲】\n${bundle.storyOutline || '（未填写）'}`);
  lines.push(`【当前卷】${bundle.volumeTitle}`);
  lines.push(`【卷细纲】\n${bundle.volumeOutline || '（未填写）'}`);
  lines.push('');
  lines.push('【本卷·当前写作章细纲】（须严格遵循）');
  lines.push(`《${bundle.currentChapterTitle}》`);
  lines.push(`细纲：${bundle.currentChapterOutline || '（未填写）'}`);
  lines.push('');
  if (bundle.prevFive.length) {
    lines.push('【本卷·当前章之前至多 5 章细纲】');
    for (const p of bundle.prevFive) {
      lines.push(`《${p.title}》；细纲：${p.outline || '（未填写）'}`);
    }
    lines.push('');
  }
  if (bundle.nextFive.length) {
    lines.push(
      '【本卷·当前章之后至多 5 章细纲】（用于衔接节奏，勿提前写完后续专章核心情节，以细纲为准）',
    );
    for (const n of bundle.nextFive) {
      lines.push(`《${n.title}》；细纲：${n.outline || '（未填写）'}`);
    }
    lines.push('');
  }
  if (retrieved.length) {
    lines.push('【向量检索 · 参考正文节选】（与上文细纲冲突时一律以细纲为准）');
    for (const r of retrieved) {
      let body = r.plainText.replace(/\s+/g, ' ').trim();
      if (body.length > MAX_REFERENCE_CHARS) {
        body = `${body.slice(0, MAX_REFERENCE_CHARS)}\n……（后略）`;
      }
      lines.push(`《${r.title}》（相似度参考 ${r.score.toFixed(4)}）`);
      lines.push(body);
      lines.push('');
    }
  } else {
    lines.push('【向量检索】当前无可附加的参考正文（细纲过短、库中无向量或未命中非邻居章等）。');
    lines.push('');
  }
  lines.push(
    `请根据以上材料，撰写《${bundle.currentChapterTitle}》的完整正文。\n` +
      '段落之间使用空行分隔；语言自然、适合在线阅读。',
  );

  console.log('buildRagChapterBodyUserPrompt: ', lines.join('\n'));
  return lines.join('\n');
}
