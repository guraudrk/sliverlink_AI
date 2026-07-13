import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCallRecordingById, updateCallRecordingAnalysis } from "@/lib/supabase/call-recordings-repo";
import { analyzeAudio } from "@/lib/silverlink/audio/audio-analyzer";
import { createAlertsFromAnalysis, indexTranscriptToRag, updateSocialScoreFromRecording } from "@/lib/silverlink/audio/recording-integrations";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recordingId: string | undefined = body?.recording_id;
  if (!recordingId) {
    return NextResponse.json({ error: "recording_id가 필요합니다." }, { status: 400 });
  }

  const recording = await getCallRecordingById(supabase, recordingId);
  if (!recording) {
    return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
  }
  if (recording.owner_user_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (!recording.storage_path) {
    return NextResponse.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
  }

  await updateCallRecordingAnalysis(supabase, recordingId, { status: "transcribing" });

  try {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("call-recordings")
      .createSignedUrl(recording.storage_path, 120);

    if (signedError || !signedData?.signedUrl) {
      throw new Error("오디오 URL 생성 실패: " + signedError?.message);
    }

    const audioResponse = await fetch(signedData.signedUrl);
    if (!audioResponse.ok) throw new Error("오디오 파일 다운로드 실패");

    const arrayBuffer = await audioResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const ext = recording.storage_path.split(".").pop()?.toLowerCase();
    const mimeType =
      ext === "webm" ? "audio/webm" :
      ext === "wav"  ? "audio/wav"  :
      ext === "mp3"  ? "audio/mp3"  :
      "audio/mp4"; // m4a, mp4 기본값

    const result = await analyzeAudio(base64, mimeType);

    await updateCallRecordingAnalysis(supabase, recordingId, {
      status: "analyzed",
      transcript: result.transcript,
      ai_summary: JSON.stringify({
        summary: result.summary,
        signals: result.signals,
      }),
      risk_level: result.risk_level,
    });

    const recordingMeta = {
      id: recordingId,
      parent_id: recording.parent_id,
      owner_user_id: recording.owner_user_id,
      parent_display_name: recording.parent_display_name,
      recorded_at: recording.recorded_at,
    };

    // safety_alerts + RAG 인덱싱 + 사회 점수 업데이트 — 병렬 실행, 실패해도 분석 결과는 유지됨
    await Promise.allSettled([
      createAlertsFromAnalysis(supabase, recordingMeta, result),
      indexTranscriptToRag(supabase, recordingMeta, result),
      updateSocialScoreFromRecording(supabase, recordingMeta, result),
    ]);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    await updateCallRecordingAnalysis(supabase, recordingId, { status: "failed" });
    return NextResponse.json({ error: err.message ?? "분석 실패" }, { status: 500 });
  }
}
