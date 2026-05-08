import { Button, Layout, Typography, message } from 'antd'
const { Sider, Content } = Layout
import { useCallback, useEffect, useMemo, useState, type Key } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { StoryChapter } from '../../../types/chapter'
import { storyApi } from '../../../api/story'
import ZhangJie from './mulu'
import WritePage, { type WriteTreeSelection } from './novel/writePage'
import StoryOutlineDialog from './storyOutlineDialog'

const Story: React.FC = () => {
  const [searchParams] = useSearchParams()
  const storyIdRaw = searchParams.get('id')
  const storyTitle = searchParams.get('title')?.trim() || ''

  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [storyOutlineOpen, setStoryOutlineOpen] = useState(false)

  const storyIdNum = useMemo(() => {
    const n = Number(storyIdRaw)
    return Number.isInteger(n) && n > 0 ? n : null
  }, [storyIdRaw])

  const loadChapters = useCallback(async () => {
    if (storyIdNum == null) {
      setChapters([])
      return
    }
    setTreeLoading(true)
    try {
      const list = await storyApi.getChapters(storyIdNum)
      setChapters(list)
    } catch (e) {
      console.error(e)
      message.error(e instanceof Error ? e.message : '加载目录失败')
      setChapters([])
    } finally {
      setTreeLoading(false)
    }
  }, [storyIdNum])

  useEffect(() => {
    void loadChapters()
  }, [loadChapters])

  const treeSelection = useMemo((): WriteTreeSelection => {
    if (selectedKeys.length === 0) return null
    const id = Number(selectedKeys[0])
    if (!Number.isInteger(id) || id <= 0) return null
    const row = chapters.find((c) => c.id === id)
    if (!row) return null
    return { id: row.id, isVolume: row.parentId === null, row }
  }, [selectedKeys, chapters])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {storyIdRaw ? (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
          }}
        >
          <Typography.Text type="secondary">
            当前作品：{storyTitle || '未命名'}（id: {storyIdRaw}）
          </Typography.Text>
          {storyIdNum != null ? (
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setStoryOutlineOpen(true)}>
              故事总纲
            </Button>
          ) : null}
        </div>
      ) : null}
      <Layout style={{ flex: 1, minHeight: 0 }}>
        <Sider
          className="write-page-sider-mulu"
          width={280}
          theme="light"
          // collapsible
          breakpoint="lg"
        >
          <ZhangJie
            storyId={storyIdNum}
            chapters={chapters}
            loading={treeLoading}
            onReloadChapters={() => void loadChapters()}
            selectedKeys={selectedKeys}
            onSelectKeys={setSelectedKeys}
          />
        </Sider>

        <Content style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <WritePage storyId={storyIdNum} selection={treeSelection} />
        </Content>

        <Sider width={320} theme="light" collapsible breakpoint="lg">
          右侧ai辅助面板
        </Sider>
      </Layout>

      {storyIdNum != null ? (
        <StoryOutlineDialog
          open={storyOutlineOpen}
          storyId={storyIdNum}
          onClose={() => setStoryOutlineOpen(false)}
          onMuluGenerated={() => void loadChapters()}
        />
      ) : null}
    </div>
  )
}

export default Story
