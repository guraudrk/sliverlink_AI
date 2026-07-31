import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { indexRagDocuments } from "@/lib/silverlink/rag/indexer";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // SECURITY DEFINER 함수로 모든 seed 작업 처리 (RLS 우회)
  const { error } = await supabase.rpc("run_demo_seed", { p_user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // seed 직후 org_members에서 데모 orgId 조회
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // 데모 데이터 삽입 후 RAG 벡터 인덱스 갱신 (AI 비서가 바로 참조 가능하도록)
  // 실패해도 seed 응답에는 영향 없음
  indexRagDocuments(supabase, user.id, {}).catch(() => {});

  return NextResponse.json({ elderCount: 30, orgId: membership?.org_id ?? null });
}
