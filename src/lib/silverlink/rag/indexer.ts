import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RAG_TIME_WINDOW_DAYS } from "./schema";
import { buildEvidence } from "./evidence-builder";
import { buildContextualText } from "./contextualizer";
import { embedTexts } from "./embedding";
import { fetchRagEvidenceSourceRows } from "@/lib/supabase/rag-evidence-repo";
import { isOwnParentProfile } from "@/lib/supabase/care-tasks-repo";
import { upsertRagDocuments } from "@/lib/supabase/rag-documents-repo";

export type IndexRagDocumentsInput = {
  parentId?: string;
  timeWindowDays?: number;
};

export type IndexRagDocumentsResult = { ok: true; indexed: number } | { ok: false; error: "parent_not_found" };

// evidence.id는 evidence-builder.ts에서 "source_type:source_id" 형태로 만들어진다.
// rag_documents.source_id에는 ':' 뒤의 원본 id만 저장한다(unique 제약이 source_type과 source_id를 같이 보므로 중복 없음).
function extractSourceId(evidenceId: string): string {
  const separatorIndex = evidenceId.indexOf(":");
  return separatorIndex === -1 ? evidenceId : evidenceId.slice(separatorIndex + 1);
}

// 실시간(생성/수정 시 즉시 임베딩)이 아니라 배치 방식을 택했다 — 디버깅이 쉽고, 처음부터
// 실시간으로 만들면 "잘 동작하는지" 확인하기 전에 복잡도가 늘어난다(가이드 Step4의 권장 순서).
export async function indexRagDocuments(
  supabase: SupabaseClient,
  ownerUserId: string,
  input: IndexRagDocumentsInput
): Promise<IndexRagDocumentsResult> {
  if (input.parentId) {
    const owns = await isOwnParentProfile(supabase, input.parentId);
    if (!owns) return { ok: false, error: "parent_not_found" };
  }

  const timeWindowDays = input.timeWindowDays ?? DEFAULT_RAG_TIME_WINDOW_DAYS;
  const rows = await fetchRagEvidenceSourceRows(supabase, { parentId: input.parentId, timeWindowDays });
  // "open" 카테고리는 evidence-builder.ts의 filterByCategory에서 아무것도 걸러내지 않는다 —
  // 적재 작업은 질문 분류와 무관하게 전체를 임베딩해야 하므로 의도적으로 이 카테고리를 쓴다.
  const evidence = buildEvidence("open", rows);

  if (evidence.length === 0) return { ok: true, indexed: 0 };

  const contextualTexts = evidence.map(buildContextualText);
  const embeddings = await embedTexts(contextualTexts);

  await upsertRagDocuments(
    supabase,
    evidence.map((item, index) => ({
      ownerUserId,
      parentId: item.parentId,
      sourceType: item.sourceType,
      sourceId: extractSourceId(item.id),
      contextualText: contextualTexts[index],
      embedding: embeddings[index],
    }))
  );

  return { ok: true, indexed: evidence.length };
}
