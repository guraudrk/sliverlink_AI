import type { SupabaseClient } from "@supabase/supabase-js";
import type { RagSourceType } from "@/lib/silverlink/rag/types";

export type RagDocumentUpsert = {
  ownerUserId: string;
  parentId: string;
  sourceType: RagSourceType;
  sourceId: string;
  contextualText: string;
  embedding: number[];
};

export type RagDocumentMatch = {
  id: string;
  source_type: string;
  source_id: string;
  contextual_text: string;
  similarity: number;
};

// source_type+source_id가 같으면 같은 row로 취급해 덮어쓴다(스키마의 unique 제약과 동일한 키).
export async function upsertRagDocuments(supabase: SupabaseClient, inputs: RagDocumentUpsert[]): Promise<void> {
  if (inputs.length === 0) return;

  const rows = inputs.map((input) => ({
    owner_user_id: input.ownerUserId,
    parent_id: input.parentId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    contextual_text: input.contextualText,
    embedding: input.embedding,
  }));

  const { error } = await supabase
    .from("rag_documents")
    .upsert(rows, { onConflict: "owner_user_id,source_type,source_id" });
  if (error) throw error;
}

// match_rag_documents SQL 함수(docs/supabase-schema-member-scoped.sql Day14 Slice 1)를 호출한다.
// 함수 본문이 auth.uid()로 직접 소유권을 거르므로 여기서 추가 검증은 필요 없다.
// parentId가 없으면(undefined) "전체 부모님" 검색 — 함수의 match_parent_id default null과 대응.
export async function searchRagDocuments(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  parentId: string | undefined,
  matchCount = 8
): Promise<RagDocumentMatch[]> {
  const { data, error } = await supabase.rpc("match_rag_documents", {
    query_embedding: queryEmbedding,
    match_parent_id: parentId ?? null,
    match_count: matchCount,
  });
  if (error) throw error;
  return (data ?? []) as RagDocumentMatch[];
}
