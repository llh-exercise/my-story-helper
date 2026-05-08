import { Button, Card, Input, Space, Typography, message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { streamChat, type ChatMessage } from '../../../api/chat'
import './index.css'

const { Text } = Typography

const ChatPage: React.FC = () => {
  /** 当前会话消息列表（用户 / 助手）；发给后端的上下文由此组装，不含未完成的空助手气泡 */
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  /** 是否正在请求 AI 流式回复（用于禁用输入、按钮 loading、气泡占位「…」） */
  const [sending, setSending] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  /** 每当消息更新（含流式追加字数）时滚到底部，便于跟随 AI 输出 */
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  /**
   * 由 streamChat 在收到 SSE 片段时调用：把文本增量拼到最后一条助手消息上。
   * 后端按 OpenAI 兼容分片推流，此处只负责把 delta 连成完整回复。
   */
  const appendAssistantDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last?.role !== 'assistant') return prev
      copy[copy.length - 1] = { ...last, content: last.content + delta }
      return copy
    })
  }, [])

  /**
   * 发送用户消息并拉取 AI 流式回复：
   * 1. 组装发给 POST /api/chat 的 messages（历史 + 本轮用户句，去掉中间空的助手占位）
   * 2. 本地先插入用户消息 + 空的助手气泡，便于立刻展示并开始接流
   * 3. streamChat 内部 fetch，解析 SSE，对每个内容分片调用 appendAssistantDelta
   * 4. 失败时提示错误；若助手仍为空则撤销本轮助手气泡，保留已发送的用户句
   */
  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    // 构造请求体：不要把「只有占位、尚无正文」的助手消息送进接口，避免污染上下文
    const history = messages.filter((m) => m.role !== 'assistant' || m.content !== '')
    const toSend: ChatMessage[] = [...history, { role: 'user', content: text }]

    setMessages([...toSend, { role: 'assistant', content: '' }])
    setInput('')
    setSending(true)

    try {
      // 模型 / API Key 等由后端读库，前端只传对话内容
      await streamChat(toSend, appendAssistantDelta)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '对话失败'
      message.error(msg)
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        // 流式尚未产出任何字时删掉空助手行，避免界面留一个空白气泡
        if (last?.role === 'assistant' && last.content === '') {
          copy.pop()
        }
        return copy
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title="AI 对话" className="chat-page__card">
      <Space direction="vertical" size="middle" className="chat-page__stack">
        <div className="chat-page__messages">
          {messages.length === 0 ? (
            <Text type="secondary">
              在下方输入内容开始对话（模型配置在「AI配置」页，由后端从数据库读取）。
            </Text>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={`chat-page__row ${m.role === 'user' ? 'chat-page__row--user' : 'chat-page__row--assistant'}`}
              >
                <Text type="secondary" className="chat-page__role">
                  {m.role === 'user' ? '你' : '助手'}
                </Text>
                <div
                  className={`chat-page__bubble ${m.role === 'user' ? 'chat-page__bubble--user' : 'chat-page__bubble--assistant'}`}
                >
                  {/* 流式生成中助手尚无正文时显示省略号占位 */}
                  {m.content || (m.role === 'assistant' && sending ? '…' : '')}
                </div>
              </div>
            ))
          )}
          <div ref={listEndRef} />
        </div>

        {/* sending 为 true 时禁止再次输入，避免同一会话并发多次 AI 请求 */}
        <Space.Compact className="chat-page__compact">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息，Enter 发送；Shift+Enter 换行"
            autoSize={{ minRows: 2, maxRows: 6 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            disabled={sending}
          />
        </Space.Compact>
        {/* loading 与 sending 同步，表示当前仍在本轮 AI 流式响应过程中 */}
        <Button type="primary" onClick={() => void handleSend()} loading={sending} block>
          发送
        </Button>
      </Space>
    </Card>
  )
}

export default ChatPage
