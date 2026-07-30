import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiClient, getLlmModel } from "@/lib/silverlink/rag/gemini-client";
import { CARE_REPORT_SYSTEM_PROMPT } from "@/lib/caseworker/care-report-prompt";

export type BatchElderData = {
  parentId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  scores: Array<{ week_start: string; score: number; call_count: number; answered_count: number }>;
  calls: Array<{ status: string; summary: string | null; created_at: string }>;
  alerts: Array<{ severity: string; title: string; description: string; acknowledged: boolean }>;
  briefs: Array<{ attention_item: string | null; created_at: string }>;
};

const STATUS_KO: Record<string, string> = {
  completed: "완료",
  help_requested: "도움 요청",
  no_answer: "미응답",
  in_progress: "진행 중",
  prepared: "준비됨",
};

/** 지정 기간 어르신 데이터를 org 스코프로 병렬 수집. owner_user_id 필터 없음 — RLS가 처리. */
export async function fetchBatchElderData(
  supabase: SupabaseClient,
  parentId: string,
  periodStart: string,
  periodEnd: string
): Promise<BatchElderData | null> {
  const startIso = new Date(periodStart).toISOString();
  const endIso   = new Date(periodEnd + "T23:59:59Z").toISOString();

  const [profileRes, scoresRes, callsRes, alertsRes, briefsRes] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("display_name")
      .eq("id", parentId)
      .maybeSingle(),
    supabase
      .from("social_scores")
      .select("week_start, score, call_count, answered_count")
      .eq("parent_id", parentId)
      .gte("week_start", periodStart)
      .lte("week_start", periodEnd)
      .order("week_start", { ascending: true }),
    supabase
      .from("care_call_attempts")
      .select("status, summary, parent_response, created_at")
      .eq("parent_id", parentId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("safety_alerts")
      .select("severity, title, description, acknowledged_at")
      .eq("elder_id", parentId)
      .gte("generated_at", startIso)
      .lte("generated_at", endIso)
      .order("generated_at", { ascending: false }),
    supabase
      .from("call_family_briefs")
      .select("attention_item, generated_at")
      .eq("elder_id", parentId)
      .gte("generated_at", startIso)
      .lte("generated_at", endIso)
      .order("generated_at", { ascending: false }),
  ]);

  if (!profileRes.data) return null;

  return {
    parentId,
    name: (profileRes.data as { display_name: string }).display_name,
    periodStart,
    periodEnd,
    scores: (scoresRes.data ?? []) as BatchElderData["scores"],
    calls: ((callsRes.data ?? []) as Array<{
      status: string; summary: string | null; parent_response: string | null; created_at: string;
    }>).map((c) => ({ status: c.status, summary: c.summary ?? c.parent_response, created_at: c.created_at })),
    alerts: ((alertsRes.data ?? []) as Array<{
      severity: string; title: string; description: string; acknowledged_at: string | null;
    }>).map((a) => ({ severity: a.severity, title: a.title, description: a.description, acknowledged: !!a.acknowledged_at })),
    briefs: ((briefsRes.data ?? []) as Array<{
      attention_item: string | null; generated_at: string;
    }>).map((b) => ({ attention_item: b.attention_item, created_at: b.generated_at })),
  };
}

export function computeRiskLevel(
  alerts: BatchElderData["alerts"]
): "critical" | "warning" | "normal" {
  const unacked = alerts.filter((a) => !a.acknowledged);
  if (unacked.some((a) => a.severity === "critical" || a.severity === "high")) return "critical";
  if (unacked.some((a) => a.severity === "medium")) return "warning";
  return "normal";
}

export function buildBatchReportPrompt(data: BatchElderData): string {
  const hasData =
    data.scores.length > 0 || data.calls.length > 0 ||
    data.alerts.length > 0 || data.briefs.length > 0;

  if (!hasData) {
    return `대상자: ${data.name}
보고 기간: ${data.periodStart} ~ ${data.periodEnd}

통화·점수·알림 데이터가 없습니다.
각 섹션을 "데이터 부족"으로 기재해주세요. 절대 추측하거나 없는 내용을 지어내지 마세요.`;
  }

  const scoreLines = data.scores.length > 0
    ? data.scores.map((s) =>
        `  - ${s.week_start} 주: 연결 점수 ${s.score}점 (통화 ${s.call_count}회, 응답 ${s.answered_count}회)`
      ).join("\n")
    : "  - 점수 데이터 없음";

  const callLines = data.calls.length > 0
    ? data.calls.slice(0, 8).map((c) => {
        const d = new Date(c.created_at).toLocaleDateString("ko-KR");
        return `  - [${d}] ${STATUS_KO[c.status] ?? c.status}${c.summary ? ` — ${c.summary.slice(0, 80)}` : ""}`;
      }).join("\n")
    : "  - 통화 기록 없음";

  const alertLines = data.alerts.length > 0
    ? data.alerts.slice(0, 5).map((a) =>
        `  - [${a.severity}] ${a.title}: ${a.description.slice(0, 80)} (${a.acknowledged ? "확인됨" : "미확인"})`
      ).join("\n")
    : "  - 안전 알림 없음";

  const briefLines = data.briefs.filter((b) => b.attention_item).slice(0, 3)
    .map((b) => `  - ${b.attention_item}`).join("\n") || "  - 특이 사항 없음";

  return `대상자: ${data.name}
보고 기간: ${data.periodStart} ~ ${data.periodEnd}

=== 사회 연결 점수 (기간 내) ===
${scoreLines}

=== 안부전화 이력 (기간 내, 최대 8건) ===
${callLines}

=== 안전 알림 ===
${alertLines}

=== AI 브리핑 주요 관찰 ===
${briefLines}

위 데이터를 바탕으로 케어 보고서를 작성하세요.
데이터가 없는 항목은 "데이터 부족"으로 명시하고 절대 추측하지 마세요.

형식:
1. 이번 기간 통화 현황 (통화 횟수·응답률 수치를 반드시 포함)

2. 상태 변화 요약 (3줄 이내)

3. 위험 플래그와 근거 (알림 없으면 "이상 없음")

4. 특이사항 (수면·식사·통증·외출·정서 언급이 있으면 발췌, 없으면 "언급 없음")

5. 권장 조치 1개 (반드시 1개만. 없으면 "정기 모니터링 유지")`;
}

export async function generateBatchReportText(data: BatchElderData): Promise<string> {
  const prompt = buildBatchReportPrompt(data);
  const result = await getGeminiClient().models.generateContent({
    model: getLlmModel(),
    contents: prompt,
    config: {
      systemInstruction: CARE_REPORT_SYSTEM_PROMPT,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 1024,
    },
  });
  return result.text ?? "";
}
