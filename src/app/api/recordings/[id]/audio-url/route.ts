import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCallRecordingById } from "@/lib/supabase/call-recordings-repo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // RLS가 소유권을 검증 — 조회 실패(null) = 없거나 권한 없음
  const recording = await getCallRecordingById(supabase, id);
  if (!recording || !recording.storage_path) {
    return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("call-recordings")
    .createSignedUrl(recording.storage_path, 300); // 5분 만료

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "URL 생성에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
