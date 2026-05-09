/**
 * 将前端 TipTap/ProseMirror JSON 正文转为纯文本（段落间空行）
 */
function nodeToPlainFragment(node: unknown): string {
  if (node == null || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text;
  }
  if (n.type === 'hardBreak') {
    return '\n';
  }
  if (Array.isArray(n.content)) {
    return n.content.map(nodeToPlainFragment).join('');
  }
  return '';
}

export function tipTapJsonStringToPlain(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '';
  try {
    const doc = JSON.parse(raw) as { type?: string; content?: unknown[] };
    if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content)) {
      return '';
    }
    const blocks = doc.content
      .map((block) => nodeToPlainFragment(block).replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return blocks.join('\n\n');
  } catch {
    return '';
  }
}
