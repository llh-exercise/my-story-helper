import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

/**
 * backend 包根目录（含 package.json、data/）。
 * - 开发：本文件在 backend/db/index.ts → 上一级即 backend
 * - 构建：在 backend/dist/db/index.js → 上一级为 dist，需再上二级到 backend
 */
function resolveBackendRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const parentName = path.basename(path.join(here, '..'));
  return parentName === 'dist'
    ? path.join(here, '..', '..')
    : path.join(here, '..');
}

const serverRoot = resolveBackendRoot();

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const raw = process.env.SQLITE_PATH?.trim() || './data/app.db';
    const abs = path.isAbsolute(raw) ? raw : path.join(serverRoot, raw);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    db = new Database(abs);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * 大模型 API 配置（单行 id=1，与旧版 config.json 等价）
 */
export function ensureLlmConfigTable(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS llm_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      provider TEXT NOT NULL DEFAULT 'deepseek',
      api_key TEXT NOT NULL DEFAULT '',
      api_base TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT 'deepseek-chat',
      updated_at INTEGER NOT NULL DEFAULT 0
    );
  `);
  const cnt = database.prepare('SELECT COUNT(*) AS c FROM llm_config').get() as { c: number };
  if (Number(cnt.c) === 0) {
    const t = Date.now();
    database
      .prepare(
        `INSERT INTO llm_config (id, provider, api_key, api_base, model, updated_at)
         VALUES (1, 'deepseek', '', '', 'deepseek-chat', ?)`
      )
      .run(t);
  }
}

/**
 * 确保 story_list 表存在；不存在则创建。
 * 字段：id、title、outline、createTime（与 StoryInfo 对齐，时间为 ISO 风格文本）
 */
export function ensureStoryListTable(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS story_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      outline TEXT NOT NULL DEFAULT '',
      "createTime" TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/**
 * 章节表：归属某个故事；parent_id 为空表示卷（顶层），否则为父节点 id。
 */
export function ensureStoryChapterTable(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS story_chapter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL REFERENCES story_list(id) ON DELETE CASCADE,
      parent_id INTEGER NULL REFERENCES story_chapter(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      outline TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      "createTime" TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_story_chapter_story_id ON story_chapter(story_id);
  `);
  const cols = database.prepare('PRAGMA table_info(story_chapter)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'outline')) {
    database.exec('ALTER TABLE story_chapter ADD COLUMN outline TEXT NOT NULL DEFAULT "";');
  }
  if (!cols.some((c) => c.name === 'content')) {
    database.exec('ALTER TABLE story_chapter ADD COLUMN content TEXT NOT NULL DEFAULT "";');
  }
}

/** 章节摘要的向量：每故事+章节唯一一行，覆盖写入 */
export function ensureStoryChapterEmbeddingTable(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS story_chapter_embedding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      source_text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      embedding_model TEXT NOT NULL DEFAULT '',
      dimensions INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (story_id) REFERENCES story_list(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES story_chapter(id) ON DELETE CASCADE,
      UNIQUE(story_id, chapter_id)
    );
    CREATE INDEX IF NOT EXISTS idx_story_chapter_embedding_story ON story_chapter_embedding(story_id);
    CREATE INDEX IF NOT EXISTS idx_story_chapter_embedding_chapter ON story_chapter_embedding(chapter_id);
  `);
  const embCols = database.prepare('PRAGMA table_info(story_chapter_embedding)').all() as { name: string }[];
  if (!embCols.some((c) => c.name === 'summary_json')) {
    database.exec(
      'ALTER TABLE story_chapter_embedding ADD COLUMN summary_json TEXT NOT NULL DEFAULT "";',
    );
  }
}
