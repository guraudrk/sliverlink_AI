import type { SupabaseClient } from "@supabase/supabase-js";
import type { AudioAnalysisResult, SafetySignal } from "./audio-analyzer";
import type { SafetyAlertCategory, SafetyAlertSeverity } from "../calls/safety-alert-analyzer";
import { createSafetyAlerts } from "@/lib/supabase/safety-alerts-repo";
import { upsertRagDocuments } from "@/lib/supabase/rag-documents-repo";
import { incrementCallFromRecording } from "@/lib/supabase/social-scores-repo";
import { embedTexts } from "../rag/embedding";

const SIGNAL_TO_CATEGORY: Record<SafetySignal["type"], SafetyAlertCategory> = {
  physical: "urgent_medical",
  emotional: "mental_health_concern",
  cognitive: "mental_health_concern",
  nutrition: "nutrition_concern",
  medication: "medication_concern",
  safety: "fall_risk",
  social: "social_isolation",
};

const RISK_TO_SEVERITY: Record<string, SafetyAlertSeverity> = {
  low: "low",
  medium: "medium",
  high: "high",
};

type RecordingMeta = {
  id: string;
  parent_id: string;
  owner_user_id: string;
  parent_display_name?: string | null;
};

// 분석 결과 → safety_alerts: detected된 신호마다 1건씩 생성 (risk_level이 none이면 스킵)
export async function createAlertsFromAnalysis(
  supabase: SupabaseClient,
  recording: RecordingMeta,
  result: AudioAnalysisResult
): Promise<void> {
  if (result.risk_level === "none") return;

  const severity = RISK_TO_SEVERITY[result.risk_level];
  if (!severity) return;

  const detectedSignals = result.signals.filter((s) => s.detected);
  if (detectedSignals.length === 0) return;

  const parentName = recording.parent_display_name ?? "어르신";

  const inserts = detectedSignals.map((sig) => ({
    call_id: recording.id,
    elder_id: recording.parent_id,
    owner_user_id: recording.owner_user_id,
    category: SIGNAL_TO_CATEGORY[sig.type],
    severity,
    title: `${parentName} — ${sig.note || sig.type} 감지`,
    description: `통화 녹음 분석에서 감지됨: ${sig.note || "(상세 없음)"}`,
    suggestion: result.risk_level === "high" ? "즉시 연락하거나 방문을 검토해주세요." : null,
  }));

  try {
    await createSafetyAlerts(supabase, inserts);
  } catch (err) {
    // 알림 생성 실패는 분석 결과를 무효화하지 않는다
    console.error("[recording-integrations] safety_alerts 생성 실패:", err);
  }
}

// 분석 완료 → 사회 연결 점수 업데이트
export async function updateSocialScoreFromRecording(
  supabase: SupabaseClient,
  recording: RecordingMeta & { recorded_at: string },
  result: AudioAnalysisResult
): Promise<void> {
  const socialDetected = result.signals.some((s) => s.type === "social" && s.detected);
  try {
    await incrementCallFromRecording(
      supabase,
      recording.owner_user_id,
      recording.parent_id,
      recording.recorded_at,
      socialDetected
    );
  } catch (err) {
    console.error("[recording-integrations] 사회 점수 업데이트 실패:", err);
  }
}

// transcript → rag_documents: AI 비서가 통화 내용 기반으로 답변 가능
export async function indexTranscriptToRag(
  supabase: SupabaseClient,
  recording: RecordingMeta,
  result: AudioAnalysisResult
): Promise<void> {
  if (!result.transcript || result.transcript === "(녹음 없음)") return;

  const parentName = recording.parent_display_name ?? "어르신";
  const contextualText = [
    `[통화 녹음 전사 — ${parentName}]`,
    `AI 요약: ${result.summary}`,
    `위험 수준: ${result.risk_level}`,
    `전사:\n${result.transcript}`,
  ].join("\n");

  try {
    const [embedding] = await embedTexts([contextualText]);
    await upsertRagDocuments(supabase, [
      {
        ownerUserId: recording.owner_user_id,
        parentId: recording.parent_id,
        sourceType: "call_recording",
        sourceId: recording.id,
        contextualText,
        embedding,
      },
    ]);
  } catch (err) {
    console.error("[recording-integrations] RAG 인덱싱 실패:", err);
  }
}
