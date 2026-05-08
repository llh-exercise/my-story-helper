import { Empty } from 'antd';
import type { StoryChapter } from '../../../../types/chapter';
import VolumeOutlineEditor from './volumeOutlineEditor';
import ChapterWriteWorkspace from './chapterWriteWorkspace';
import './writePage.css';

/** 与父组件 write/index 中 treeSelection 一致 */
export type WriteTreeSelection = {
  id: number;
  isVolume: boolean;
  row: StoryChapter;
} | null;

export type WritePageProps = {
  storyId: number | null;
  selection: WriteTreeSelection;
};

/** 写作入口：卷 / 章各自独立子模块，仅传入故事与当前树节点 id */
const WritePage: React.FC<WritePageProps> = ({ storyId, selection }) => {
  if (storyId == null) {
    return (
      <div className="write-page">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请从故事列表进入写作页" />
      </div>
    );
  }

  if (selection == null) {
    return (
      <div className="write-page">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请在左侧选择卷或章节" />
      </div>
    );
  }

  if (selection.isVolume) {
    return <VolumeOutlineEditor storyId={storyId} nodeId={selection.id} />;
  }

  return <ChapterWriteWorkspace storyId={storyId} nodeId={selection.id} />;
};

export default WritePage;
