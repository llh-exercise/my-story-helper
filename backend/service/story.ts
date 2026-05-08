import type { StoryInfo } from '../types/index.js';
import { getDb } from '../db/index.js';

export function listStories(): StoryInfo[] {
  const db = getDb();
  return db.prepare('SELECT id, title, outline, createTime FROM story_list ORDER BY id DESC').all() as StoryInfo[];
}

export function createStory(story: StoryInfo): StoryInfo {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO story_list (title, outline) VALUES (@title, @outline) RETURNING id, title, outline, createTime',
  )

  return stmt.get({ title: story.title, outline: story.outline ?? '' }) as StoryInfo
}

export function getStoryById(id: number): StoryInfo | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, title, outline, createTime FROM story_list WHERE id = ?')
    .get(id) as StoryInfo | undefined;
  return row ?? null;
}

export function updateStory(
  id: number,
  payload: { title: string; outline: string },
): StoryInfo | null {
  const db = getDb();
  const existing = getStoryById(id);
  if (!existing) {
    return null;
  }
  db.prepare('UPDATE story_list SET title = @title, outline = @outline WHERE id = @id').run({
    title: payload.title,
    outline: payload.outline,
    id,
  });
  return getStoryById(id);
}
