/** 余弦相似度，长度须一致 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return -1;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * 在「章节摘要向量」候选池上，按与 queryVec 的余弦相似度取 Top-K。
 * 供正文生成 RAG 使用：queryVec 一般由当前章细纲 `generateEmbedding` 得到，
 * candidates 来自 `listChapterEmbeddingsWithVectorsForStory`；邻居章在 excludeIds 中剔除，
 * 避免与目录上下文重复引用（见 chapterGenerateBody）。
 *
 * 处理顺序：
 * 1. 去掉 excludeIds 中的章节（如同卷前后窗口已在 prompt 里出现）。
 * 2. 仅保留 vec 维度与 queryVec 一致的行（维度不同无法可靠比相似度，且多模型/脏数据时应丢弃）。
 * 3. 逐条计算余弦相似度作为 score（范围约 [-1, 1]，越大越相近）。
 * 4. 丢弃 score ≤ -0.25 的弱相关/异常对，减少无关正文进入 prompt。
 * 5. 按 score 降序排序后取前 topK 条；若 topK ≤ 0 则返回空数组。
 */
export function topKSimilarByEmbedding(
  queryVec: number[],
  candidates: { chapterId: number; vec: number[] }[],
  excludeIds: Set<number>,
  topK: number,
): { chapterId: number; score: number }[] {
  if (topK <= 0) return [];
  return candidates
    .filter((c) => !excludeIds.has(c.chapterId) && c.vec.length === queryVec.length)
    .map((c) => ({ chapterId: c.chapterId, score: cosineSimilarity(queryVec, c.vec) }))
    .filter((x) => x.score > -0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
