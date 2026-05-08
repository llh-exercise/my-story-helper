import type { Request, Response } from 'express';
import {
  createChapter,
  createVolume,
  getChapterById,
  listChaptersByStoryId,
  updateChapter,
} from '../service/chapter.js';

export function getStoryChapterById(req: Request, res: Response): void {
  try {
    const storyId = Number(req.params.storyId);
    const chapterId = Number(req.params.chapterId);
    if (
      !Number.isInteger(storyId) ||
      storyId <= 0 ||
      !Number.isInteger(chapterId) ||
      chapterId <= 0
    ) {
      res.status(400).json({ error: '无效的参数' });
      return;
    }
    const row = getChapterById(storyId, chapterId);
    if (!row) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: '获取章节失败' });
  }
}

export function getStoryChapters(req: Request, res: Response): void {
  try {
    const storyId = Number(req.params.storyId);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      res.status(400).json({ error: '无效的故事 id' });
      return;
    }
    const list = listChaptersByStoryId(storyId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: '获取章节列表失败' });
  }
}

type CreateVolumeBody = {
  title?: unknown;
  outline?: unknown;
};

export function postStoryVolume(req: Request, res: Response): void {
  try {
    const storyId = Number(req.params.storyId);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      res.status(400).json({ error: '无效的故事 id' });
      return;
    }
    const body = req.body as CreateVolumeBody;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const outline = typeof body.outline === 'string' ? body.outline.trim() : '';
    if (!title) {
      res.status(400).json({ error: '请填写卷名' });
      return;
    }
    const created = createVolume(storyId, { title, outline });
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: '新增卷失败' });
  }
}

type PostChapterBody = {
  parentId?: unknown;
  title?: unknown;
  outline?: unknown;
};

/** 在指定卷下新增章节 */
export function postStoryChapter(req: Request, res: Response): void {
  try {
    const storyId = Number(req.params.storyId);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      res.status(400).json({ error: '无效的故事 id' });
      return;
    }
    const body = req.body as PostChapterBody;
    const parentId = Number(body.parentId);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      res.status(400).json({ error: '无效的卷 id' });
      return;
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const outline = typeof body.outline === 'string' ? body.outline.trim() : '';
    if (!title) {
      res.status(400).json({ error: '请填写章节名' });
      return;
    }
    const created = createChapter(storyId, parentId, { title, outline });
    if (!created) {
      res.status(400).json({ error: '父节点不是本故事下的卷' });
      return;
    }
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: '新增章节失败' });
  }
}

type PutChapterBody = {
  title?: unknown;
  outline?: unknown;
  content?: unknown;
};

/** 修改卷或章的名称、细纲；可选 content 更新正文 */
export function putStoryChapter(req: Request, res: Response): void {
  try {
    const storyId = Number(req.params.storyId);
    const chapterId = Number(req.params.chapterId);
    if (!Number.isInteger(storyId) || storyId <= 0 || !Number.isInteger(chapterId) || chapterId <= 0) {
      res.status(400).json({ error: '无效的参数' });
      return;
    }
    const body = req.body as PutChapterBody;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const outline = typeof body.outline === 'string' ? body.outline.trim() : '';
    if (!title) {
      res.status(400).json({ error: '名称不能为空' });
      return;
    }
    const content =
      body.content !== undefined && body.content !== null && typeof body.content === 'string'
        ? body.content
        : undefined;
    const updated = updateChapter(storyId, chapterId, { title, outline, content });
    if (!updated) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
}
