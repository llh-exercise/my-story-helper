/** story_chapter 表行（与 API 返回结构一致） */
export interface StoryChapter {
  id: number;
  storyId: number;
  /** null 表示卷 / 顶层节点 */
  parentId: number | null;
  title: string;
  /** 卷/章细纲（卷为卷细纲） */
  outline: string;
  /** 章节正文（TipTap JSON 字符串）；列表接口固定为空串 */
  content: string;
  sortOrder: number;
  createTime: string;
}

/** 章节结构化摘要（向量/RAG 用，与前端 ChapterVectorSummary 一致） */
export type ChapterVectorSummaryPayload = {
  characters: string;
  plot: string;
  powerChanges: string;
  foreshadowing: string;
  locations: string;
};
