import { Button, Input, Modal, Space, Spin, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { ChapterVectorSummary } from '../../../../types/chapter';
import { storyApi } from '../../../../api/story';

export type ChapterVectorSummaryDialogProps = {
  open: boolean;
  summary: ChapterVectorSummary | null;
  /** 父级「根据正文生成向量」拉取摘要进行中（含首次模型生成） */
  summaryLoading?: boolean;
  onClose: () => void;
  storyId: number;
  chapterId: number;
  /** 重新生成或落库后同步父级 state */
  onSummaryChange?: (summary: ChapterVectorSummary) => void;
};
const emptySummary: ChapterVectorSummary = {
  characters: '',
  plot: '',
  powerChanges: '',
  foreshadowing: '',
  locations: '',
};

const fields: { key: keyof ChapterVectorSummary; label: string }[] = [
  { key: 'characters', label: '出场人物' },
  { key: 'plot', label: '关键剧情' },
  { key: 'powerChanges', label: '实力变化' },
  { key: 'foreshadowing', label: '伏笔与悬念' },
  { key: 'locations', label: '地点与场景' },
];

/**
 * 展示/编辑向量库中的本章摘要；重新生成会调模型并覆盖库；「生成向量」调用嵌入接口并写库
 */
export function ChapterVectorSummaryDialog(props: ChapterVectorSummaryDialogProps) {
  const { open, summary, summaryLoading = false, onClose, storyId, chapterId, onSummaryChange } = props;
  const [draft, setDraft] = useState<ChapterVectorSummary>(emptySummary);
  const [embedding, setEmbedding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (open && summary) {
      setDraft({ ...summary });
    }
  }, [open, summary]);

  const onRegenerateClick = async () => {
    try {
      setRegenerating(true);
      const { summary: next } = await storyApi.summarizeChapterBodyForVector(storyId, chapterId, {
        regenerate: true,
      });
      setDraft({ ...next });
      onSummaryChange?.(next);
      message.success('已重新根据正文生成摘要并更新向量库');
    } catch (e) {
      console.error(e);
      message.error(e instanceof Error ? e.message : '重新生成失败');
    } finally {
      setRegenerating(false);
    }
  };

  const onGenerateVectorClick = async () => {
    try {
      setEmbedding(true);
      const r = await storyApi.saveChapterEmbedding(storyId, chapterId, { summary: draft });
      onSummaryChange?.(draft);
      message.success(`向量已写入向量库（维度 ${r.dimensions}）`);
    } catch (e) {
      console.error(e);
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setEmbedding(false);
    }
  };
  return (
    <Modal
      title="本章摘要（向量库）"
      open={open}
      onCancel={onClose}
      width={720}
      footer={
        <Space wrap>
          <Button onClick={onClose} disabled={summaryLoading}>
            关闭
          </Button>
          <Button loading={regenerating} disabled={summaryLoading} onClick={() => void onRegenerateClick()}>
            重新生成
          </Button>
          <Button
            type="primary"
            loading={embedding}
            disabled={summaryLoading}
            onClick={() => void onGenerateVectorClick()}
          >
            生成向量
          </Button>
        </Space>
      }
      destroyOnClose
    >
      {summaryLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Spin tip="正在从向量库加载或根据正文生成摘要…" />
        </div>
      ) : (
        <>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            首次打开时若无库中记录会根据已保存正文生成并写入向量库；有记录则直接展示。修改正文后可用「重新生成」覆盖库中摘要；「生成向量」根据当前表单调用 DeepSeek 嵌入并保存。
          </Typography.Paragraph>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {fields.map(({ key, label }) => (
              <div key={key}>
                <Typography.Text strong>{label}</Typography.Text>
                <Input.TextArea
                  value={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  autoSize={{ minRows: 2, maxRows: 8 }}
                  style={{ marginTop: 6 }}
                />
              </div>
            ))}
          </Space>
        </>
      )}
    </Modal>
  );
}
