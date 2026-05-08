import { apiUrl } from './rest.ts';
import type { StoryInfo } from '../types/config.ts';
import type { StoryChapter } from '../types/chapter.ts';
import { http } from './http.js';
/**
 * 故事
 */
export const storyApi = {
  /** GET /api/storyList */
  getList() {
    return http.get<StoryInfo[]>(apiUrl('/storyList')).then((res) => res.data);
  },

  /** GET /api/story/:storyId/chapters */
  getChapters(storyId: number) {
    return http.get<StoryChapter[]>(apiUrl(`/story/${storyId}/chapters`)).then((res) => res.data);
  },

  /** GET /api/story/:storyId/chapters/:chapterId 单条含正文 */
  getChapter(storyId: number, chapterId: number) {
    return http.get<StoryChapter>(apiUrl(`/story/${storyId}/chapters/${chapterId}`)).then((res) => res.data);
  },

  /** POST /api/story/:storyId/chapters/volume 新增一卷 */
  createVolume(storyId: number, payload: Pick<StoryChapter, 'title' | 'outline'>) {
    return http
      .post<StoryChapter>(apiUrl(`/story/${storyId}/chapters/volume`), payload)
      .then((res) => res.data);
  },

  /** POST /api/story/:storyId/chapters 在某卷下新增章节 */
  createChapter(storyId: number, payload: { parentId: number; title: string; outline?: string }) {
    return http
      .post<StoryChapter>(apiUrl(`/story/${storyId}/chapters`), {
        parentId: payload.parentId,
        title: payload.title,
        outline: payload.outline ?? '',
      })
      .then((res) => res.data);
  },

  /** PUT /api/story/:storyId/chapters/:chapterId；可选 content 更新正文 */
  updateChapter(
    storyId: number,
    chapterId: number,
    payload: Pick<StoryChapter, 'title' | 'outline'> & { content?: string },
  ) {
    return http
      .put<StoryChapter>(apiUrl(`/story/${storyId}/chapters/${chapterId}`), payload)
      .then((res) => res.data);
  },

  /** POST /api/story */
  create(payload: Pick<StoryInfo, 'title' | 'outline'>) {
    return http.post<StoryInfo>(apiUrl('/story'), payload).then((res) => res.data);
  },

  /** GET /api/story/:id */
  get(id: number) {
    return http.get<StoryInfo>(apiUrl(`/story/${id}`)).then((res) => res.data);
  },

  /** PUT /api/story/:id 更新标题、总纲等 */
  update(id: number, payload: StoryInfo) {
    return http.put<StoryInfo>(apiUrl(`/story/${id}`), payload).then((res) => res.data);
  },

  /**
   * POST /api/story/:id/outline-generate-mulu
   * 将总纲交给 DeepSeek 生成 JSON 目录并写入数据库（可能较久）
   */
  generateMuluFromOutline(storyId: number, outline: string) {
    return http
      .post<{ ok: true; volumesCreated: number; chaptersCreated: number }>(
        apiUrl(`/story/${storyId}/outline-generate-mulu`),
        { outline },
        { timeout: 180_000 },
      )
      .then((res) => res.data);
  },

  /**
   * POST /api/story/:storyId/chapters/:chapterId/generate-body-from-outline
   * 根据总纲/卷细纲/本章及前序章细纲生成本章正文（纯文本）
   */
  generateChapterBodyFromOutline(
    storyId: number,
    chapterId: number,
    body: { chapterOutline: string },
  ) {
    return http
      .post<{ content: string }>(
        apiUrl(`/story/${storyId}/chapters/${chapterId}/generate-body-from-outline`),
        body,
        { timeout: 180_000 },
      )
      .then((res) => res.data);
  },

  /** DELETE /api/story/:id */
  delete(id: number) {
    return http.delete<StoryInfo>(apiUrl(`/story/${id}`)).then((res) => res.data);
  },
};