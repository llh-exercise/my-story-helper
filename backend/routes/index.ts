import { Router } from 'express';
import { getConfig, postConfig } from '../controller/config.js';
import { postChat } from '../controller/chat.js';
import { getStoryList, createStory, getStoryDetail, putStoryDetail } from '../controller/story.js';
import { postOutlineGenerateMulu } from '../controller/storyOutlineMulu.js';
import {
  getStoryChapterById,
  getStoryChapters,
  postStoryChapter,
  postStoryVolume,
  putStoryChapter,
} from '../controller/chapter.js';
import { postGenerateChapterBodyFromOutline } from '../controller/chapterGenerateBody.js';

const router = Router();

router.get('/config', getConfig);
router.post('/config', postConfig);
router.post('/chat', postChat);
router.get('/storyList', getStoryList);
router.post('/story', createStory);
router.get('/story/:storyId', getStoryDetail);
router.put('/story/:storyId', putStoryDetail);
router.post('/story/:storyId/outline-generate-mulu', postOutlineGenerateMulu);
router.get('/story/:storyId/chapters', getStoryChapters);
router.get('/story/:storyId/chapters/:chapterId', getStoryChapterById);
router.post(
  '/story/:storyId/chapters/:chapterId/generate-body-from-outline',
  postGenerateChapterBodyFromOutline,
);
router.post('/story/:storyId/chapters/volume', postStoryVolume);
router.post('/story/:storyId/chapters', postStoryChapter);
router.put('/story/:storyId/chapters/:chapterId', putStoryChapter);

export default router;
