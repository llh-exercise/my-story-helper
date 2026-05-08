import { Button, Card, Input, List, Space, Typography, message } from 'antd'
import { useEffect } from 'react'
import { useImmer } from 'use-immer'
import { api } from './api/client'
import { useUiStore } from './store/useUiStore'

const { Title, Paragraph } = Typography

type StoryRow = { id: number; title: string; body: string; created_at: string }

type Health = { ok: boolean; service: string }

export default function App() {
  const pageTitle = useUiStore((s) => s.pageTitle)
  const setPageTitle = useUiStore((s) => s.setPageTitle)

  const [draft, updateDraft] = useImmer({ title: '', body: '' })
  const [rows, updateRows] = useImmer<StoryRow[]>([])
  const [health, updateHealth] = useImmer<Health | null>(null)

  async function refreshList() {
    const res = await api.get<StoryRow[]>('/stories')
    updateRows(() => res.data)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.get<Health>('/health')
        updateHealth(() => res.data)
        await refreshList()
      } catch {
        message.error('无法连接后端，请确认已 npm run dev 且后端在 3000 端口')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时拉取
  }, [])

  async function onSubmit() {
    if (!draft.title.trim()) {
      message.warning('请先填写标题')
      return
    }
    await api.post('/stories', {
      title: draft.title.trim(),
      body: draft.body.trim(),
    })
    updateDraft((d) => {
      d.title = ''
      d.body = ''
    })
    message.success('已保存')
    await refreshList()
  }

  return (
    <div style={{ padding: 24, maxWidth: 880, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            {pageTitle}
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            前端：React + Zustand + useImmer + Ant Design + Axios · 后端：Express + SQLite
          </Paragraph>
          <Paragraph style={{ marginTop: 8 }}>
            <Button type="link" onClick={() => setPageTitle('我的创作工作台')} style={{ paddingLeft: 0 }}>
              用 Zustand 改标题示例
            </Button>
          </Paragraph>
          {health && (
            <Paragraph type="secondary">
              后端健康检查：{health.ok ? '正常' : '异常'}（{health.service}）
            </Paragraph>
          )}
        </div>

        <Card title="新建一条故事草稿（useImmer 管理表单草稿）">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="标题"
              value={draft.title}
              onChange={(e) =>
                updateDraft((d) => {
                  d.title = e.target.value
                })
              }
            />
            <Input.TextArea
              placeholder="正文"
              autoSize={{ minRows: 3, maxRows: 8 }}
              value={draft.body}
              onChange={(e) =>
                updateDraft((d) => {
                  d.body = e.target.value
                })
              }
            />
            <Button type="primary" onClick={onSubmit}>
              提交到 SQLite
            </Button>
          </Space>
        </Card>

        <Card title="已保存列表（来自 /api/stories）">
          <List
            dataSource={rows}
            locale={{ emptyText: '暂无数据' }}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta title={item.title} description={item.body || '（无正文）'} />
                <div style={{ color: '#999', fontSize: 12 }}>{item.created_at}</div>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </div>
  )
}
