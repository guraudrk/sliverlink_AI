import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * DELETE /api/org/delete-elder
 * body: { orgId, parentId }
 *
 * 어르신 1명의 모든 데이터를 삭제한다. 기관 관리자 전용.
 * 삭제 순서: Storage 녹음 파일 → call_recordings → reports → parent_profiles
 * 접근 로그에 'data_delete' 기록 후 처리.
 */
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { orgId?: string; parentId?: string };
  const { orgId, parentId } = body;
  if (!orgId || !parentId) return NextResponse.json({ error: "orgId and parentId required" }, { status: 400 });

  // 관리자 확인
  const { data: member } = await supabase
    .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (member?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 어르신이 이 기관 소속인지 확인
  const { data: profile } = await supabase
    .from("parent_profiles").select("org_id").eq("id", parentId).maybeSingle();
  if (profile?.org_id !== orgId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // 접근 로그 기록 (삭제 전)
  await supabase.from("access_logs").insert({
    org_id: orgId, user_id: user.id, parent_id: parentId, action: "data_delete",
  });

  // 1. Storage 녹음 파일 삭제
  const { data: recordings } = await supabase
    .from("call_recordings")
    .select("storage_path")
    .eq("parent_id", parentId)
    .not("storage_path", "is", null);

  const paths = (recordings ?? [])
    .map((r) => r.storage_path as string)
    .filter(Boolean);

  if (paths.length > 0) {
    await supabase.storage.from("call-recordings").remove(paths);
  }

  // 2. call_recordings 삭제
  await supabase.from("call_recordings").delete().eq("parent_id", parentId);

  // 3. reports 삭제
  await supabase.from("reports").delete().eq("parent_id", parentId);

  // 4. parent_profiles 삭제
  const { error } = await supabase.from("parent_profiles").delete().eq("id", parentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
