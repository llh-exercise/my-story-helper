import type { ChapterVectorSummaryPayload } from '../types/chapterTypes.js';

/** 弹窗五字段拼成用于入库与后续嵌入的原文 */
export function chapterSummaryToSourceText(s: ChapterVectorSummaryPayload): string {
  return [
    `【出场人物】${s.characters}`,
    `【关键剧情】${s.plot}`,
    `【实力变化】${s.powerChanges}`,
    `【伏笔与悬念】${s.foreshadowing}`,
    `【地点与场景】${s.locations}`,
  ]
    .join('\n')
    .trim();
}
