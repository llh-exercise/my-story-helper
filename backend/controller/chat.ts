import type { Request, Response } from 'express';
import { streamText, type ModelMessage } from 'ai';
import type { LlmKeyConfig } from '../types/index.js';
import { readLlmConfig } from '../service/config.js';
import { createChatModel } from '../utils/chat.js';

function flushRes(res: Response) {
  const r = res as unknown as { flush?: () => void };
  if (typeof r.flush === 'function') r.flush();
}

/** 与前端解析逻辑一致的 OpenAI 流式分片 */
function sseOpenAiDelta(content: string) {
  return `data: ${JSON.stringify({
    object: 'chat.completion.chunk',
    choices: [{ index: 0, delta: { content } }],
  })}\n\n`;
}

export function toModelMessages(raw: unknown[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new Error('messages 中存在无效项');
    }
    const { role, content } = item as { role?: string; content?: unknown };
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      throw new Error(`不支持的消息角色: ${String(role)}`);
    }
    if (typeof content !== 'string') {
      throw new Error('消息 content 须为字符串');
    }
    out.push({ role, content });
  }
  return out;
}

/** 将 system 从 messages 中拆出，供 streamText 使用 system 选项，避免 SDK 安全告警 */
function extractSystemPrompt(messages: ModelMessage[]): {
  system: string | undefined;
  messages: ModelMessage[];
} {
  const systemChunks: string[] = [];
  const rest: ModelMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemChunks.push(m.content);
    } else {
      rest.push(m);
    }
  }
  return {
    system: systemChunks.length > 0 ? systemChunks.join('\n\n') : undefined,
    messages: rest,
  };
}

/**
 * 使用 AI SDK streamText，输出为 OpenAI Chat SSE（供现有前端消费）
 */
export async function pipeChatAsOpenAiSse(
  res: Response,
  cfg: LlmKeyConfig,
  rawMessages: unknown[]
): Promise<void> {
  const messages = toModelMessages(rawMessages);
  const model = createChatModel(cfg);

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const { system, messages: coreMessages } = extractSystemPrompt(messages);
    if (coreMessages.length === 0) {
      res.write(`data: ${JSON.stringify({ error: '除 system 外至少需要一条 user 或 assistant 消息' })}\n\n`);
      res.end();
      return;
    }
    const result = streamText({
      model,
      ...(system !== undefined ? { system } : {}),
      messages: coreMessages,
    });
    for await (const text of result.textStream) {
      if (text) {
        res.write(sseOpenAiDelta(text));
        flushRes(res);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '流式输出失败';
    try {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    } catch {
      /* ignore */
    }
    res.end();
  }
}

/**
 * 对话接口：从 SQLite 读取 llm_config，用 AI SDK + DeepSeek 流式返回（OpenAI 兼容 SSE 分片）
 */
export async function postChat(req: Request, res: Response): Promise<void> {
  try {
    const cfg = readLlmConfig();
    const raw = req.body?.messages;
    if (!Array.isArray(raw)) {
      res.status(400).json({ error: '请求体须包含 messages 数组' });
      return;
    }
    if (raw.length === 0) {
      res.status(400).json({ error: 'messages 不能为空' });
      return;
    }
    await pipeChatAsOpenAiSse(res, cfg, raw);
  } catch (e) {
    if (res.headersSent) {
      try {
        res.end();
      } catch {
        /* ignore */
      }
      return;
    }
    const msg = e instanceof Error ? e.message : '对话失败';
    res.status(400).json({ error: msg });
  }
}
