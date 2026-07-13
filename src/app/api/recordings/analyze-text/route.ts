import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { analyzeText } from "@/lib/silverlink/audio/text-analyzer";
import {
  createAlertsFromAnalysis,
  indexTranscriptToRag,
  updateSocialScoreFromRecording,
} from "@/lib/silverlink/audio/recording-integrations";

export async function POST(request: NextRequest) {
  // 웹(쿠키) + 모바일(Bearer 토큰) 모두 지원
  const authHeader = request.headers.get("authorization");
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;

  if (authHeader?.startsWith("Bearer ")) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    ) as any;
  } else {
    supabase = await createSupabaseServerClient();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text: string | undefined = body?.text;
  const parentId: string | undefined = body?.parent_id;

  if (!text?.trim()) {
    return NextResponse.json({ error: "통화 내용(text)이 필요합니다." }, { status: 400 });
  }
  if (text.length > 10_000) {
    return NextResponse.json({ error: "통화 내용은 10,000자 이하여야 합니다." }, { status: 400 });
  }
  if (!parentId) {
    return NextResponse.json({ error: "parent_id가 필요합니다." }, { status: 400 });
  }

  // 어르신 소유권 확인
  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id, display_name")
    .eq("id", parentId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!parent) {
    return NextResponse.json({ error: "등록된 어르신을 찾을 수 없습니다." }, { status: 404 });
  }

  const recordedAt = new Date().toISOString();

  // call_recordings 행 생성
  const { data: inserted, error: insertErr } = await supabase
    .from("call_recordings")
    .insert({
      owner_user_id: user.id,
      parent_id: parentId,
      storage_path: null,
      status: "transcribing",
      transcript: text.trim(),
      recorded_at: recordedAt,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "기록 생성 실패: " + insertErr?.message }, { status: 500 });
  }

  const recordingId = inserted.id;

  try {
    const result = await analyzeText(text.trim());

    await supabase
      .from("call_recordings")
      .update({
        status: "analyzed",
        ai_summary: JSON.stringify({ summary: result.summary, signals: result.signals }),
        risk_level: result.risk_level,
      })
      .eq("id", recordingId);

    const recordingMeta = {
      id: recordingId,
      parent_id: parentId,
      owner_user_id: user.id,
      parent_display_name: parent.display_name,
      recorded_at: recordedAt,
    };

    await Promise.allSettled([
      createAlertsFromAnalysis(supabase, recordingMeta, result),
      indexTranscriptToRag(supabase, recordingMeta, result),
      updateSocialScoreFromRecording(supabase, recordingMeta, result),
    ]);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    await supabase
      .from("call_recordings")
      .update({ status: "failed" })
      .eq("id", recordingId);

    return NextResponse.json({ error: err.message ?? "분석 실패" }, { status: 500 });
  }
}
