// CRAG(Corrective RAG, arxiv 2401.15884)의 핵심 아이디어를 단순화한 버전:
// 검색된 근거를 무조건 LLM에게 넘기지 말고, 먼저 "이 근거가 정말 관련 있는가"를 점수로 확인한다.
// 논문의 풀 버전은 별도 평가 모델을 학습시키지만, 우리는 데이터 규모가 작아 유사도 임계값으로 충분하다.
export const DEFAULT_RELEVANCE_THRESHOLD = 0.5;

export function checkEvidenceQuality(
  evidenceWithScores: { similarity?: number }[],
  threshold: number = DEFAULT_RELEVANCE_THRESHOLD
): boolean {
  if (evidenceWithScores.length === 0) return false;
  // 호출 측이 정렬해서 넘긴다고 가정하지 않고, 가진 점수 중 최댓값으로 판단한다
  // (키워드 검색 결과처럼 similarity가 없는 항목은 무시).
  const topScore = evidenceWithScores.reduce((max, item) => Math.max(max, item.similarity ?? 0), 0);
  return topScore >= threshold;
}
