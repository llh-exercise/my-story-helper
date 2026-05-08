import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { storyApi } from '../../../../api/story';

/**
 * 细纲草稿与保存：仅依赖故事 id、节点 id、当前标题与初始细纲文案。
 */
export function useOutlineDraftSave(
  storyId: number,
  nodeId: number,
  title: string,
  initialOutline: string,
) {
  const [outlineDraft, setOutlineDraft] = useState(initialOutline);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOutlineDraft(initialOutline);
  }, [nodeId, initialOutline]);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      const updated = await storyApi.updateChapter(storyId, nodeId, {
        title,
        outline: outlineDraft.trim(),
      });
      setOutlineDraft(updated.outline ?? '');
      message.success('细纲已保存');
    } catch (e) {
      console.error(e);
      message.error(e instanceof Error ? e.message : '保存细纲失败');
    } finally {
      setSaving(false);
    }
  }, [storyId, nodeId, title, outlineDraft]);

  return { outlineDraft, setOutlineDraft, saving, save };
}
