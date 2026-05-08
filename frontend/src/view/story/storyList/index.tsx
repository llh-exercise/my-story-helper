import { storyApi } from '../../../api/story'
import type { StoryInfo } from '../../../types/config'
import { useCallback, useEffect, useState } from 'react'
import { Card, Spin, Typography, message, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createSearchParams, useNavigate } from 'react-router-dom'
import AddStoryDialog from './addStoryDialog'

/** 将服务端时间字符串格式化为本地可读文案 */
function formatCreateTime(raw: string): string {
  if (!raw) return '—'
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString('zh-CN')
}

const StoryList: React.FC = () => {
  const navigate = useNavigate()
  const [list, setList] = useState<StoryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const goWrite = (item: StoryInfo) => {
    navigate({
      pathname: '/story/write',
      search: createSearchParams({
        id: String(item.id),
        title: item.title || '未命名',
      }).toString(),
    })
  }

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await storyApi.getList()
      setList(res)
    } catch (err) {
      console.error(err)
      message.error(err instanceof Error ? err.message : '加载列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  return (
    <div
      className="story-list"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
      }}
    >
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        故事列表
      </Typography.Title>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Spin spinning={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {list.map((item) => (
              <Card key={item.id} size="small" hoverable onClick={() => goWrite(item)}>
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                  {item.title || '未命名'}
                </Typography.Title>
                <Typography.Paragraph
                  type="secondary"
                  ellipsis={{
                    rows: 3,
                    expandable: true,
                    symbol: '展开',
                    onExpand: (e) => e.stopPropagation(),
                  }}
                  style={{ marginBottom: 8 }}
                >
                  {item.outline?.trim() ? item.outline : '暂无大纲'}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  创建时间：{formatCreateTime(item.createTime)}
                </Typography.Text>
              </Card>
            ))}

            <Card
              size="small"
              styles={{
                body: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 120,
                  cursor: 'pointer',
                },
              }}
              style={{ borderStyle: 'dashed' }}
              onClick={() => setAddOpen(true)}
            >
              <PlusOutlined style={{ fontSize: 28, color: 'var(--ant-color-text-tertiary)' }} />
            </Card>
          </Space>
        </Spin>
      </div>

      <AddStoryDialog
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onSuccess={() => void loadList()}
      />
    </div>
  )
}

export default StoryList
