import { Alert, Button, Modal, Space, Typography, message, Input } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import type { StoryInfo } from '../../../types/config';
import { storyApi } from '../../../api/story';

export type StoryOutlineDialogProps = {
  open: boolean;
  storyId: number;
  onClose: () => void;
  /** 生成目录并写入成功后调用，用于刷新左侧树 */
  onMuluGenerated: () => void;
};

/**
 * 故事总纲弹窗：编辑总纲、保存到 story_list、或调用大模型生成卷/章目录
 */
const StoryOutlineDialog: React.FC<StoryOutlineDialogProps> = ({
  open,
  storyId,
  onClose,
  onMuluGenerated,
}) => {
  const [story, setStory] = useState<StoryInfo | null>(null);
  const [outlineDraft, setOutlineDraft] = useState('');
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const resetWhenClosed = useCallback(() => {
    setStory(null);
    setOutlineDraft('');
    setLoadErr(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetWhenClosed();
      return;
    }
    let cancelled = false;
    setLoadingStory(true);
    setLoadErr(null);
    void (async () => {
      try {
        const s = await storyApi.get(storyId);
        if (!cancelled) {
          setStory(s);
          setOutlineDraft(s.outline ?? '');
        }
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : '加载故事失败');
          setStory(null);
        }
      } finally {
        if (!cancelled) setLoadingStory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storyId, resetWhenClosed]);

  const handleSaveOutline = async () => {
    if (!story) {
      message.warning('故事尚未加载完成');
      return;
    }
    try {
      setSaving(true);
      await storyApi.update(storyId, { ...story, outline: outlineDraft });
      message.success('总纲已保存');
      setStory((prev) => (prev ? { ...prev, outline: outlineDraft } : prev));
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMulu = async () => {
    const text = outlineDraft.trim();
    if (!text) {
      message.warning('请先填写总纲');
      return;
    }
    try {
      setGenerating(true);
      const r = await storyApi.generateMuluFromOutline(storyId, text);
      message.success(
        `已生成并写入：${r.volumesCreated} 卷，共 ${r.chaptersCreated} 章`,
      );
      onMuluGenerated();
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '生成目录失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title="故事总纲"
      open={open}
      onCancel={onClose}
      width={720}
      footer={null}
      destroyOnHidden
    >
      {loadErr ? (
        <Typography.Text type="danger">{loadErr}</Typography.Text>
      ) : null}

      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 8, marginBottom: 16 }}
        message="生成新目录前会清空本作已有内容"
        description="若当前故事下已有卷、章或正文，点击「根据总纲生成章节目录」后，将先删除全部既有卷/章（含各章正文），再写入模型生成的新目录。此操作不可恢复。"
      />

      <Input.TextArea
        value={outlineDraft}
        onChange={(e) => setOutlineDraft(e.target.value)}
        placeholder="在此编辑故事总纲……"
        autoSize={{ minRows: 14, maxRows: 22 }}
        disabled={loadingStory || !!loadErr}
        style={{ marginBottom: 16 }}
      />

      <Space wrap>
        <Button
          type="primary"
          loading={saving}
          disabled={loadingStory || !story || generating}
          onClick={() => void handleSaveOutline()}
        >
          保存总纲
        </Button>
        <Button
          danger
          loading={generating}
          disabled={loadingStory || !!loadErr}
          onClick={() => void handleGenerateMulu()}
        >
          根据总纲生成章节目录
        </Button>
        <Typography.Text type="secondary" style={{ maxWidth: 320 }}>
          使用「模型配置」中的 DeepSeek；后端解析 JSON 后覆盖写入卷与章节。
        </Typography.Text>
      </Space>
    </Modal>
  );
};

export default StoryOutlineDialog;
