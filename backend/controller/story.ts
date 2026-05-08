import type { Request, Response } from 'express';
import {
  listStories,
  createStory as createStoryService,
  getStoryById,
  updateStory as updateStoryService,
} from '../service/story.js';

export function getStoryList(req: Request, res: Response): void {
    try {
        const stories = listStories();
        res.json(stories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get story list' });
    }
}

export function createStory(req: Request, res: Response): void {
    try {
        const story = createStoryService(req.body);
        res.json(story);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create story' });
    }
}

export function getStoryDetail(req: Request, res: Response): void {
  try {
    const id = Number(req.params.storyId);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: '无效的故事 id' });
      return;
    }
    const story = getStoryById(id);
    if (!story) {
      res.status(404).json({ error: '故事不存在' });
      return;
    }
    res.json(story);
  } catch {
    res.status(500).json({ error: '获取故事失败' });
  }
}

type PutStoryBody = {
  title?: unknown;
  outline?: unknown;
};

export function putStoryDetail(req: Request, res: Response): void {
  try {
    const id = Number(req.params.storyId);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: '无效的故事 id' });
      return;
    }
    const body = req.body as PutStoryBody;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const outline = typeof body.outline === 'string' ? body.outline.trim() : '';
    if (!title) {
      res.status(400).json({ error: '标题不能为空' });
      return;
    }
    const updated = updateStoryService(id, { title, outline });
    if (!updated) {
      res.status(404).json({ error: '故事不存在' });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: '更新故事失败' });
  }
}