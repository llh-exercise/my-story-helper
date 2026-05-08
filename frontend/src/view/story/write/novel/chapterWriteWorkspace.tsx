import type { JSONContent } from 'novel';
import { EditorContent, EditorRoot, Placeholder, StarterKit, useEditor } from 'novel';
import { Button, Input, Spin, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { StoryChapter } from '../../../../types/chapter';
import { storyApi } from '../../../../api/story';
import { useOutlineDraftSave } from './outlineDraftSave';

export type ChapterWriteWorkspaceProps = {
  storyId: number;
  nodeId: number;
};

const emptyDoc: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
};

function parseChapterContent(raw: string | undefined | null): JSONContent {
  if (!raw || !String(raw).trim()) return emptyDoc;
  try {
    const j = JSON.parse(raw) as JSONContent;
    if (j && j.type === 'doc') return j;
    return emptyDoc;
  } catch {
    return emptyDoc;
  }
}

/** 将模型返回的纯文本转为 TipTap 文档（优先空行分段，否则按单行分段） */
function plainTextToTipTapDoc(text: string): JSONContent {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return emptyDoc;
  }
  let parts = normalized
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    parts = normalized
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (parts.length === 0) {
    parts = [normalized];
  }
  return {
    type: 'doc',
    content: parts.map((p) => ({
      type: 'paragraph',
      content: p ? [{ type: 'text', text: p }] : [],
    })),
  };
}

function ChapterSaveBar(props: {
  storyId: number;
  chapterId: number;
  title: string;
  /** 章节细纲当前草稿（可与未保存的输入框一致，生成时一并传给模型） */
  outline: string;
}) {
  const { editor } = useEditor();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const onGenerate = async () => {
    if (!editor) return;
    try {
      setGenerating(true);
      const { content } = await storyApi.generateChapterBodyFromOutline(props.storyId, props.chapterId, {
        chapterOutline: props.outline,
      });
      const doc = plainTextToTipTapDoc(content);
      editor.chain().focus().setContent(doc).run();
      message.success('正文已写入编辑器，可按需修改后再保存');
    } catch (e) {
      console.error(e);
      message.error(e instanceof Error ? e.message : '根据细纲生成正文失败');
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async () => {
    if (!editor) return;
    try {
      setSaving(true);
      const content = JSON.stringify(editor.getJSON());
      await storyApi.updateChapter(props.storyId, props.chapterId, {
        title: props.title,
        outline: props.outline,
        content,
      });
      message.success('正文已保存');
    } catch (e) {
      console.error(e);
      message.error(e instanceof Error ? e.message : '保存正文失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="small" loading={generating} disabled={!editor || saving} onClick={() => void onGenerate()}>
        根据细纲生成正文
      </Button>
      <Button type="primary" size="small" loading={saving} disabled={!editor || generating} onClick={() => void onSave()}>
        保存正文
      </Button>
    </>
  );
}

/** 章节写作区：仅 storyId + 章节节点 id，内部一次加载并协调细纲与正文 */
function ChapterWriteLoaded({
  storyId,
  detail,
}: {
  storyId: number;
  detail: StoryChapter;
}) {
  const { outlineDraft, setOutlineDraft, saving, save } = useOutlineDraftSave(
    storyId,
    detail.id,
    detail.title,
    detail.outline ?? '',
  );

  const initialContent = parseChapterContent(detail.content);

  return (
    <div className="write-page write-page--chapter">
      <div className="write-page__section write-page__outline-section">
        <div className="write-page__outline-toolbar">
          <Typography.Text strong className="write-page__section-label">
            章节细纲
          </Typography.Text>
          <Button type="primary" size="small" loading={saving} onClick={() => void save()}>
            保存细纲
          </Button>
        </div>
        <div className="write-page__outline-fill">
          <Input.TextArea
            value={outlineDraft}
            onChange={(e) => setOutlineDraft(e.target.value)}
            placeholder="本章概要……"
          />
        </div>
      </div>

      <div className="write-page__ai-gap" aria-hidden title="预留给 AI 区域" />

      <div className="write-page__section write-page__body-section">
        <div className="write-page__body-toolbar">
          <Typography.Text type="secondary">{detail.title || '未命名'} · 正文</Typography.Text>
        </div>
        <div className="write-page__editor-wrap">
          <div className="novel-write" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EditorRoot key={detail.id}>
              <EditorContent
                className="novel-write__editor"
                initialContent={initialContent}
                extensions={[
                  StarterKit.configure({
                    heading: { levels: [4, 5] },
                  }),
                  Placeholder.configure({
                    placeholder: '在此书写本章正文……',
                  }),
                ]}
              >
                <div className="novel-write__editor-bar">
                  <ChapterSaveBar
                    storyId={storyId}
                    chapterId={detail.id}
                    title={detail.title}
                    outline={outlineDraft}
                  />
                </div>
              </EditorContent>
            </EditorRoot>
          </div>
        </div>
      </div>
    </div>
  );
}

const ChapterWriteWorkspace: React.FC<ChapterWriteWorkspaceProps> = ({ storyId, nodeId }) => {
  const [detail, setDetail] = useState<StoryChapter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const d = await storyApi.getChapter(storyId, nodeId);
        if (!cancelled) setDetail(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          message.error(e instanceof Error ? e.message : '加载章节失败');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, nodeId]);

  if (loading) {
    return (
      <div className="write-page write-page--center">
        <Spin />
      </div>
    );
  }

  if (detail == null) {
    return (
      <div className="write-page write-page--center">
        <Typography.Text type="secondary">未能加载章节</Typography.Text>
      </div>
    );
  }

  return <ChapterWriteLoaded storyId={storyId} detail={detail} />;
};

export default ChapterWriteWorkspace;
