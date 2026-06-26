import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RAG_TIME_WINDOW_DAYS, type RagQueryRequest } from "./schema";
import { classifyQuery } from "./query-classifier";
import { buildEvidence } from "./evidence-builder";
import { fetchRagEvidenceSourceRows, type RagEvidenceSourceRows } from "@/lib/supabase/rag-evidence-repo";
import { isOwnParentProfile } from "@/lib/supabase/care-tasks-repo";
import { searchRagDocuments, type RagDocumentMatch } from "@/lib/supabase/rag-documents-repo";
import { embedText } from "./embedding";
import { buildHistoryAwareSearchText } from "./conversation-history";
import { fuseResults, type RankedItem } from "./hybrid-search";
import { checkEvidenceQuality } from "./crag-check";
import type { RagEvidence, RagQueryCategory } from "./types";

export type RagEvidenceResult =
  | { ok: true; category: RagQueryCategory; evidence: RagEvidence[] }
  | { ok: false; error: "parent_not_found" };

// /api/rag/evidence(Day12)와 /api/rag/ask(Day13)가 똑같은 "소유권 검증 → 분류 → 조회 → 정규화"
// 과정을 거쳐야 해서, 중복을 막기 위해 공유 함수로 추출했다.
export async function resolveRagEvidence(supabase: SupabaseClient, input: RagQueryRequest): Promise<RagEvidenceResult> {
  if (input.parentId) {
    const owns = await isOwnParentProfile(supabase, input.parentId);
    if (!owns) return { ok: false, error: "parent_not_found" };
  }

  const category = classifyQuery(input.query);
  const timeWindowDays = input.timeWindowDays ?? DEFAULT_RAG_TIME_WINDOW_DAYS;
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  // 질문 임베딩은 rows(DB 조회) 결과를 기다릴 필요가 없는 독립적인 작업이라, DB 조회와 동시에 시작해
  // 두 네트워크 왕복을 순차적으로 더하지 않고 겹친다(직렬 대기 시간 절감).
  // "그 중에 도움 필요한 거 있어?"처럼 직전 질문 없이는 의미가 빈약한 후속 질문을 위해, 최근 자녀
  // 질문을 현재 질문 앞에 붙여서 임베딩한다(buildHistoryAwareSearchText) — 분류(classifyQuery)는
  // 키워드 기반이라 과거 발화가 섞이면 오분류 위험이 커서 input.query만 그대로 쓴다.
  const searchText = buildHistoryAwareSearchText(input.query, input.history);
  const queryEmbeddingPromise = hasGeminiKey ? embedText(searchText).catch(() => null) : null;

  const rows = await fetchRagEvidenceSourceRows(supabase, { parentId: input.parentId, timeWindowDays });
  const keywordEvidence = buildEvidence(category, rows);

  // GEMINI_API_KEY가 없으면 Day12/13과 동일한 키워드 검색만 사용한다 — 키가 생기는 순간 자동으로
  // 벡터 검색이 추가되고, 키가 없어도 기존 동작이 그대로 유지된다(회귀 없는 점진적 강화).
  if (!queryEmbeddingPromise) {
    return { ok: true, category, evidence: keywordEvidence };
  }

  const queryEmbedding = await queryEmbeddingPromise;
  if (!queryEmbedding) return { ok: true, category, evidence: keywordEvidence };

  const evidence = await mergeWithVectorSearch(supabase, input, rows, keywordEvidence, queryEmbedding);
  return { ok: true, category, evidence };
}

// Hybrid Search: 키워드 검색(정확한 매칭) + 벡터 검색(의미 매칭)을 RRF로 합친다.
// CRAG: 벡터 검색의 최고 유사도가 임계값 미달이면("이 채널은 이 질문엔 못 믿겠다") 벡터 결과 전체를
// 버리고 키워드 결과만 쓴다 — 낮은 점수 일부만 골라내는 게 아니라, 채널 전체에 대한 이분법적 판단이다.
async function mergeWithVectorSearch(
  supabase: SupabaseClient,
  input: RagQueryRequest,
  rows: RagEvidenceSourceRows,
  keywordEvidence: RagEvidence[],
  queryEmbedding: number[]
): Promise<RagEvidence[]> {
  let vectorMatches: RagDocumentMatch[];
  try {
    vectorMatches = await searchRagDocuments(supabase, queryEmbedding, input.parentId);
  } catch {
    // 벡터 검색이 일시적으로 실패해도 RAG 전체를 죽이지 않고 키워드 결과는 그대로 보여준다.
    return keywordEvidence;
  }

  const reliableVectorMatches = checkEvidenceQuality(vectorMatches) ? vectorMatches : [];
  if (reliableVectorMatches.length === 0) return keywordEvidence;

  // "open" 카테고리는 필터링 없이 전체를 반환하므로(evidence-builder.ts), 벡터 검색이 찾아낸 항목이
  // 카테고리 필터 때문에 keywordEvidence에서 빠져 있어도 여기서 원본 RagEvidence를 찾을 수 있다.
  const fullEvidenceById = new Map(buildEvidence("open", rows).map((item) => [item.id, item] as const));

  const keywordRanked: RankedItem<RagEvidence>[] = keywordEvidence.map((item) => ({ id: item.id, item }));
  const vectorRanked: RankedItem<RagEvidence>[] = reliableVectorMatches
    .map((match) => {
      const id = `${match.source_type}:${match.source_id}`;
      const item = fullEvidenceById.get(id);
      return item ? { id, item } : null;
    })
    .filter((entry): entry is RankedItem<RagEvidence> => entry !== null);

  return fuseResults(keywordRanked, vectorRanked);
}
