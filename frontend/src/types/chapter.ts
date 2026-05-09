/** 根据正文生成的本章摘要（用于向量/检索准备） */
export interface ChapterVectorSummary {
  characters: string;
  plot: string;
  powerChanges: string;
  foreshadowing: string;
  locations: string;
}

/** 章节（与后端 story_chapter / API 一致） */
export interface StoryChapter {
  id: number;
  storyId: number;
  parentId: number | null;
  title: string;
  outline: string;
  /** 正文（TipTap JSON）；列表接口为空串 */
  content: string;
  sortOrder: number;
  createTime: string;
}
