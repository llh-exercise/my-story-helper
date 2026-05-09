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

/** 按相似度降序，排除 excludeIds 中的章节 */
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
