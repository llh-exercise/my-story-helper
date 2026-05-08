import { Button, Input, Spin, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { storyApi } from '../../../../api/story';
import { useOutlineDraftSave } from './outlineDraftSave';

export type VolumeOutlineEditorProps = {
  storyId: number;
  nodeId: number;
};

/** 卷细纲：仅 storyId + 卷节点 id，内部拉取并保存 */
const VolumeOutlineEditor: React.FC<VolumeOutlineEditorProps> = ({ storyId, nodeId }) => {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [initialOutline, setInitialOutline] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const d = await storyApi.getChapter(storyId, nodeId);
        if (!cancelled) {
          setTitle(d.title);
          setInitialOutline(d.outline ?? '');
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          message.error(e instanceof Error ? e.message : '加载卷信息失败');
          setTitle('');
          setInitialOutline('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, nodeId]);

  const { outlineDraft, setOutlineDraft, saving, save } = useOutlineDraftSave(
    storyId,
    nodeId,
    title,
    initialOutline,
  );

  if (loading) {
    return (
      <div className="write-page write-page--center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="write-page write-page--volume">
      <div className="write-page__heading-row">
        <Typography.Title level={5} className="write-page__heading">
          {title || '未命名'} · 卷细纲
        </Typography.Title>
        <Button type="primary" loading={saving} onClick={() => void save()}>
          保存细纲
        </Button>
      </div>
      <div className="write-page__outline-fill">
        <Input.TextArea
          value={outlineDraft}
          onChange={(e) => setOutlineDraft(e.target.value)}
          placeholder="编辑卷细纲……"
        />
      </div>
    </div>
  );
};

export default VolumeOutlineEditor;
