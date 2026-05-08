import { apiUrl } from './rest';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/**
 * POST /api/chat，解析 OpenAI 兼容的 SSE 流，将文本增量交给 onDelta
 */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
): Promise<void> {
  const res = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `请求失败 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('服务器未返回流式数据');
  }

  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const segments = buf.split('\n\n');
    buf = segments.pop() ?? '';

    for (const segment of segments) {
      for (const line of segment.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as {
            error?: string;
            choices?: Array<{ delta?: { content?: string } }>;
          };
          if (json.error) {
            throw new Error(String(json.error));
          }
          const chunk = json.choices?.[0]?.delta?.content;
          if (typeof chunk === 'string' && chunk.length > 0) {
            onDelta(chunk);
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }

    if (done) break;
  }
}
