import { DownOutlined, EditOutlined, FileAddOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Tree, Tooltip, Spin, Empty } from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';
import { useEffect, useMemo, useState, type Key, type ReactNode } from 'react';
import type { StoryChapter } from '../../../../types/chapter';
import AddVolumeDialog from './addVolumeDialog';
import AddChapterDialog from './addChapterDialog';
import EditVolumeDialog from './editVolumeDialog';
import EditChapterDialog from './editChapterDialog';
import './index.css';

export type ZhangJieProps = {
  storyId: number | null;
  chapters: StoryChapter[];
  loading: boolean;
  onReloadChapters: () => void;
  selectedKeys: Key[];
  onSelectKeys: (keys: Key[]) => void;
};

/** 将扁平章节列表转为 antd Tree 数据（parentId 为 null 者为卷/根） */
function chaptersToTreeData(
  chapters: StoryChapter[],
  renderTitle: (node: StoryChapter, isVolume: boolean) => ReactNode,
): TreeDataNode[] {
  const byParent = new Map<number | null, StoryChapter[]>();
  for (const c of chapters) {
    const p = c.parentId;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.id - b.id));
  }
  const build = (parentId: number | null): TreeDataNode[] =>
    (byParent.get(parentId) ?? []).map((n) => {
      const isVolume = n.parentId === null;
      const children = isVolume ? build(n.id) : [];
      return {
        title: renderTitle(n, isVolume),
        key: String(n.id),
        ...(children.length > 0 ? { children } : {}),
      };
    });
  return build(null);
}

function collectExpandableKeys(nodes: TreeDataNode[]): string[] {
  const keys: string[] = [];
  const walk = (list: TreeDataNode[]) => {
    for (const n of list) {
      if (n.children && n.children.length > 0) {
        keys.push(String(n.key));
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}

const ZhangJie: React.FC<ZhangJieProps> = ({
  storyId,
  chapters,
  loading,
  onReloadChapters,
  selectedKeys,
  onSelectKeys,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [volumeDialogOpen, setVolumeDialogOpen] = useState(false);
  const [editVolume, setEditVolume] = useState<StoryChapter | null>(null);
  const [editChapter, setEditChapter] = useState<StoryChapter | null>(null);
  const [addChapterVolumeId, setAddChapterVolumeId] = useState<number | null>(null);

  const treeData = useMemo(
    () =>
      chaptersToTreeData(chapters, (n, isVolume) => (
        <span className="mulu-tree-title-row">
          <span className="mulu-tree-title-text" title={n.title || '未命名'}>
            {n.title || '未命名'}
          </span>
          <span className="mulu-tree-title-actions" onClick={(e) => e.stopPropagation()}>
            {isVolume ? (
              <>
                <Tooltip title="修改卷名">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditVolume(n);
                    }}
                  />
                </Tooltip>
                <Tooltip title="增加章节">
                  <Button
                    type="text"
                    size="small"
                    icon={<FileAddOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddChapterVolumeId(n.id);
                    }}
                  />
                </Tooltip>
              </>
            ) : (
              <Tooltip title="修改章节名">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditChapter(n);
                  }}
                />
              </Tooltip>
            )}
          </span>
        </span>
      )),
    [chapters],
  );

  useEffect(() => {
    setExpandedKeys(collectExpandableKeys(treeData));
  }, [treeData]);

  const onSelect: TreeProps['onSelect'] = (keys) => {
    onSelectKeys(keys);
  };

  return (
    <div className="mulu-panel">
      <div className="mulu-header">
        章节树
        <Tooltip title="新加卷">
          <Button
            shape="circle"
            icon={<PlusOutlined />}
            disabled={storyId == null}
            onClick={() => setVolumeDialogOpen(true)}
          />
        </Tooltip>
      </div>
      <div className="mulu-tree-scroll">
        <Spin spinning={loading}>
          {storyId == null ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请从故事列表进入写作页" />
          ) : treeData.length === 0 && !loading ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无章节，可先添加卷/章" />
          ) : treeData.length > 0 ? (
            <Tree
              className="mulu-tree"
              showLine
              blockNode
              switcherIcon={({ expanded }) => (
                <DownOutlined
                  style={{ transform: `rotate(${expanded ? 0 : -90}deg)`, transition: 'transform 0.3s' }}
                />
              )}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys)}
              selectedKeys={selectedKeys}
              onSelect={onSelect}
              treeData={treeData}
            />
          ) : null}
        </Spin>
      </div>
      <AddVolumeDialog
        open={volumeDialogOpen}
        storyId={storyId}
        onCancel={() => setVolumeDialogOpen(false)}
        onSuccess={() => void onReloadChapters()}
      />
      <EditVolumeDialog
        open={editVolume != null}
        storyId={storyId}
        chapter={editVolume}
        onCancel={() => setEditVolume(null)}
        onSuccess={() => void onReloadChapters()}
      />
      <EditChapterDialog
        open={editChapter != null}
        storyId={storyId}
        chapter={editChapter}
        onCancel={() => setEditChapter(null)}
        onSuccess={() => void onReloadChapters()}
      />
      <AddChapterDialog
        open={addChapterVolumeId != null}
        storyId={storyId}
        volumeId={addChapterVolumeId}
        onCancel={() => setAddChapterVolumeId(null)}
        onSuccess={() => void onReloadChapters()}
      />
    </div>
  );
};

export default ZhangJie;
