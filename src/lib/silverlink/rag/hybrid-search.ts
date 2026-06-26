// Hybrid Search: 벡터 검색(의미 유사도)과 SQL/키워드 검색(정확한 매칭) 결과를 합친다.
// 두 검색의 점수 척도가 달라서(유사도 0~1 vs 있다/없다) 점수를 직접 비교할 수 없으므로,
// 정보검색 분야의 표준 기법인 Reciprocal Rank Fusion(RRF, Cormack et al. 2009)으로 "순위"만 보고 합산한다.
const RRF_K = 60;

export type RankedItem<T> = { id: string; item: T };

export function fuseResults<T>(...resultLists: RankedItem<T>[][]): T[] {
  const scored = new Map<string, { item: T; score: number }>();

  for (const list of resultLists) {
    list.forEach((entry, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (rank + RRF_K);
      const existing = scored.get(entry.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scored.set(entry.id, { item: entry.item, score: rrfScore });
      }
    });
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
