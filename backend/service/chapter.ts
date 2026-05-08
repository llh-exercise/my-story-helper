import type { StoryChapter } from '../types/index.js';
import { getDb } from '../db/index.js';
import { getStoryById } from './story.js';

/** 列表接口不返回正文，减少流量 */
type RowList = {
  id: number;
  story_id: number;
  parent_id: number | null;
  title: string;
  outline: string;
  sort_order: number;
  createTime: string;
};

type RowFull = RowList & { content: string };

function rowToChapterList(r: RowList): StoryChapter {
  return {
    id: r.id,
    storyId: r.story_id,
    parentId: r.parent_id,
    title: r.title,
    outline: r.outline ?? '',
    sortOrder: r.sort_order,
    createTime: r.createTime,
    content: '',
  };
}

function rowToChapterFull(r: RowFull): StoryChapter {
  return {
    id: r.id,
    storyId: r.story_id,
    parentId: r.parent_id,
    title: r.title,
    outline: r.outline ?? '',
    sortOrder: r.sort_order,
    createTime: r.createTime,
    content: r.content ?? '',
  };
}

/** 按故事 id 查询全部章节（扁平列表，不含正文） */
export function listChaptersByStoryId(storyId: number): StoryChapter[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, story_id, parent_id, title, outline, sort_order, "createTime" AS createTime
       FROM story_chapter
       WHERE story_id = ?
       ORDER BY parent_id IS NOT NULL, parent_id, sort_order, id`,
    )
    .all(storyId) as RowList[];
  return rows.map(rowToChapterList);
}

/** 单条（含正文 JSON） */
export function getChapterById(storyId: number, chapterId: number): StoryChapter | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, story_id, parent_id, title, outline, content, sort_order, "createTime" AS createTime
       FROM story_chapter WHERE id = ? AND story_id = ?`,
    )
    .get(chapterId, storyId) as RowFull | undefined;
  if (!row) return null;
  return rowToChapterFull(row);
}

/** 在故事下新增一卷（parent_id 为空） */
export function createVolume(
  storyId: number,
  payload: { title: string; outline: string },
): StoryChapter {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO story_chapter (story_id, parent_id, title, outline, sort_order)
     VALUES (
       @story_id,
       NULL,
       @title,
       @outline,
       (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM story_chapter AS s
        WHERE s.story_id = @story_id AND s.parent_id IS NULL)
     )
     RETURNING id, story_id, parent_id, title, outline, content, sort_order, "createTime" AS createTime`,
  );
  const row = stmt.get({
    story_id: storyId,
    title: payload.title,
    outline: payload.outline,
  }) as RowFull;
  return rowToChapterFull(row);
}

/** 在某卷下新增章节（parent 须为卷：parent_id IS NULL） */
export function createChapter(
  storyId: number,
  volumeId: number,
  payload: { title: string; outline: string },
): StoryChapter | null {
  const db = getDb();
  const parent = db
    .prepare(`SELECT id, parent_id, story_id FROM story_chapter WHERE id = ?`)
    .get(volumeId) as { id: number; parent_id: number | null; story_id: number } | undefined;
  if (!parent || parent.story_id !== storyId || parent.parent_id !== null) {
    return null;
  }
  const stmt = db.prepare(
    `INSERT INTO story_chapter (story_id, parent_id, title, outline, sort_order)
     VALUES (
       @story_id,
       @parent_id,
       @title,
       @outline,
       (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM story_chapter AS s
        WHERE s.story_id = @story_id AND s.parent_id = @parent_id)
     )
     RETURNING id, story_id, parent_id, title, outline, content, sort_order, "createTime" AS createTime`,
  );
  const row = stmt.get({
    story_id: storyId,
    parent_id: volumeId,
    title: payload.title,
    outline: payload.outline,
  }) as RowFull;
  return rowToChapterFull(row);
}

/** 更新卷/章名称与细纲；若传入 content 则同时更新正文列 */
export function updateChapter(
  storyId: number,
  chapterId: number,
  payload: { title: string; outline: string; content?: string },
): StoryChapter | null {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM story_chapter WHERE id = ? AND story_id = ?`)
    .get(chapterId, storyId) as { id: number } | undefined;
  if (!existing) {
    return null;
  }
  if (payload.content !== undefined) {
    db.prepare(
      `UPDATE story_chapter SET title = @title, outline = @outline, content = @content
       WHERE id = @chapterId AND story_id = @storyId`,
    ).run({
      title: payload.title,
      outline: payload.outline,
      content: payload.content,
      chapterId,
      storyId,
    });
  } else {
    db.prepare(
      `UPDATE story_chapter SET title = @title, outline = @outline
       WHERE id = @chapterId AND story_id = @storyId`,
    ).run({
      title: payload.title,
      outline: payload.outline,
      chapterId,
      storyId,
    });
  }
  return getChapterById(storyId, chapterId);
}

export type ChapterGenerationTrailItem = {
  title: string;
  outline: string;
  isCurrent: boolean;
};

export type ChapterGenerationContext = {
  storyTitle: string;
  storyOutline: string;
  volumeTitle: string;
  volumeOutline: string;
  chapterOutlinesTrail: ChapterGenerationTrailItem[];
  currentChapterTitle: string;
};

/**
 * 组装「根据细纲生成本章正文」所需上下文：故事总纲、卷细纲、本卷内本章及之前各章细纲
 * @param chapterOutlineDraft 若传入字符串（可为空），作为本章细纲；否则用数据库中的本章细纲
 */
export function getChapterGenerationContext(
  storyId: number,
  chapterId: number,
  chapterOutlineDraft?: string,
): ChapterGenerationContext | null {
  const story = getStoryById(storyId);
  if (!story) {
    return null;
  }
  const chapter = getChapterById(storyId, chapterId);
  if (!chapter || chapter.parentId == null) {
    return null;
  }
  const volume = getChapterById(storyId, chapter.parentId);
  if (!volume || volume.parentId != null) {
    return null;
  }

  const db = getDb();
  const siblings = db
    .prepare(
      `SELECT id, title, outline, sort_order
       FROM story_chapter
       WHERE story_id = ? AND parent_id = ?
       ORDER BY sort_order ASC, id ASC`,
    )
    .all(storyId, chapter.parentId) as {
      id: number;
      title: string;
      outline: string;
      sort_order: number;
    }[];

  const idx = siblings.findIndex((s) => s.id === chapterId);
  if (idx === -1) {
    return null;
  }

  const trail: ChapterGenerationTrailItem[] = siblings.slice(0, idx + 1).map((s) => ({
    title: s.title,
    outline:
      s.id === chapterId
        ? chapterOutlineDraft !== undefined
          ? chapterOutlineDraft
          : (s.outline ?? '')
        : (s.outline ?? ''),
    isCurrent: s.id === chapterId,
  }));

  return {
    storyTitle: story.title,
    storyOutline: story.outline ?? '',
    volumeTitle: volume.title,
    volumeOutline: volume.outline ?? '',
    chapterOutlinesTrail: trail,
    currentChapterTitle: chapter.title,
  };
}

export type GeneratedVolumePayload = {
  title: string;
  outline: string;
  chapters: { title: string; outline: string }[];
};

/**
 * 根据总纲生成结果覆盖目录：先删除本作全部卷/章，再插入新树（同一事务）
 */
export function replaceMuluFromGeneratedOutline(
  storyId: number,
  payload: { volumes: GeneratedVolumePayload[] },
): void {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare('DELETE FROM story_chapter WHERE story_id = ? AND parent_id IS NULL').run(storyId);
    for (const vol of payload.volumes) {
      const createdVol = createVolume(storyId, { title: vol.title, outline: vol.outline });
      for (const ch of vol.chapters) {
        createChapter(storyId, createdVol.id, { title: ch.title, outline: ch.outline });
      }
    }
  });
  run();
}
