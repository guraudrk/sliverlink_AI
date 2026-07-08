import type { SupabaseClient } from "@supabase/supabase-js";

export type ElderReportData = {
  name: string;
  relationship: string | null;
  reportPeriod: { from: string; to: string };
  scores: Array<{ week_start: string; score: number; call_count: number; answered_count: number }>;
  calls: Array<{ status: string; summary: string | null; created_at: string }>;
  alerts: Array<{ severity: string; title: string; description: string; acknowledged: boolean }>;
  briefs: Array<{ attention_item: string | null; created_at: string }>;
};

/** 최근 4주 어르신 데이터를 병렬로 수집한다. */
export async function fetchElderReportData(
  supabase: SupabaseClient,
  parentId: string,
  userId: string
): Promise<ElderReportData | null> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [profileResult, scoresResult, callsResult, alertsResult, briefsResult] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("display_name, relationship")
      .eq("id", parentId)
      .eq("owner_user_id", userId)
      .maybeSingle(),
    supabase
      .from("social_scores")
      .select("week_start, score, call_count, answered_count")
      .eq("parent_id", parentId)
      .eq("owner_user_id", userId)
      .gte("week_start", fromDate)
      .order("week_start", { ascending: true }),
    supabase
      .from("care_call_attempts")
      .select("status, summary, parent_response, created_at")
      .eq("parent_id", parentId)
      .eq("owner_user_id", userId)
      .gte("created_at", fourWeeksAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("safety_alerts")
      .select("severity, title, description, acknowledged_at")
      .eq("elder_id", parentId)
      .eq("owner_user_id", userId)
      .gte("generated_at", fourWeeksAgo)
      .order("generated_at", { ascending: false }),
    supabase
      .from("call_family_briefs")
      .select("attention_item, generated_at")
      .eq("elder_id", parentId)
      .eq("owner_user_id", userId)
      .gte("generated_at", fourWeeksAgo)
      .order("generated_at", { ascending: false }),
  ]);

  if (!profileResult.data) return null;

  return {
    name: profileResult.data.display_name,
    relationship: profileResult.data.relationship,
    reportPeriod: { from: fromDate, to: today },
    scores: (scoresResult.data ?? []) as ElderReportData["scores"],
    calls: ((callsResult.data ?? []) as Array<{
      status: string; summary: string | null; parent_response: string | null; created_at: string;
    }>).map((c) => ({
      status: c.status,
      summary: c.summary ?? c.parent_response,
      created_at: c.created_at,
    })),
    alerts: ((alertsResult.data ?? []) as Array<{
      severity: string; title: string; description: string; acknowledged_at: string | null;
    }>).map((a) => ({
      severity: a.severity,
      title: a.title,
      description: a.description,
      acknowledged: !!a.acknowledged_at,
    })),
    briefs: ((briefsResult.data ?? []) as Array<{
      attention_item: string | null; generated_at: string;
    }>).map((b) => ({
      attention_item: b.attention_item,
      created_at: b.generated_at,
    })),
  };
}

const STATUS_KO: Record<string, string> = {
  completed: "완료",
  help_requested: "도움 요청",
  no_answer: "미응답",
  in_progress: "진행 중",
  prepared: "준비됨",
};

const SEVERITY_KO: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export const CARE_REPORT_SYSTEM_PROMPT = `당신은 한국 노인 복지 실무 전문가입니다.
제공된 어르신 4주치 돌봄 데이터를 바탕으로, 사회복지사가 상급 기관에 제출하는 주간 케어 보고서 초안을 작성해주세요.

[작성 규칙]
- 반드시 아래 5개 섹션 순서대로 작성
- 의학적 진단·처방·확정적 판단 금지 — 관찰 사실과 경향만 기술
- 전문 용어보다 평이한 실무 한국어 사용
- 마지막 섹션에서 "직접 연락 필요 여부"를 [필요] 또는 [불필요]로 명시하고 한 줄 사유 기재
- 각 섹션 제목은 "1. 이번 주 주요 현황" 형식으로 유지`;

export function buildCareReportPrompt(data: ElderReportData): string {
  const scoreLines = data.scores.length > 0
    ? data.scores.map((s) =>
        `  - ${s.week_start} 주: 사회 연결 점수 ${s.score}점 (통화 ${s.call_count}회, 응답 ${s.answered_count}회)`
      ).join("\n")
    : "  - 점수 데이터 없음";

  const callLines = data.calls.length > 0
    ? data.calls.slice(0, 8).map((c) => {
        const date = new Date(c.created_at).toLocaleDateString("ko-KR");
        return `  - [${date}] ${STATUS_KO[c.status] ?? c.status}${c.summary ? ` — ${c.summary.slice(0, 80)}` : ""}`;
      }).join("\n")
    : "  - 통화 기록 없음";

  const alertLines = data.alerts.length > 0
    ? data.alerts.slice(0, 5).map((a) =>
        `  - [${SEVERITY_KO[a.severity] ?? a.severity}] ${a.title}: ${a.description.slice(0, 60)} (${a.acknowledged ? "확인됨" : "미확인"})`
      ).join("\n")
    : "  - 안전 알림 없음";

  const briefLines = data.briefs.filter((b) => b.attention_item).slice(0, 3).map((b) =>
    `  - ${b.attention_item}`
  ).join("\n") || "  - 특이 사항 없음";

  const latestScore = data.scores.at(-1);
  const prevScore = data.scores.at(-2);
  const scoreTrend = latestScore && prevScore
    ? `현재 ${latestScore.score}점 (전주 ${prevScore.score}점 → ${latestScore.score > prevScore.score ? "▲ 상승" : latestScore.score < prevScore.score ? "▼ 하락" : "유지"})`
    : latestScore
      ? `현재 ${latestScore.score}점 (비교 데이터 없음)`
      : "점수 없음";

  return `대상자: ${data.name}${data.relationship ? ` (${data.relationship})` : ""}
보고 기간: ${data.reportPeriod.from} ~ ${data.reportPeriod.to}

=== 사회 연결 점수 추이 ===
${scoreLines}
종합: ${scoreTrend}

=== 안부전화 이력 (최근 4주, 최대 8건) ===
${callLines}

=== 안전 알림 ===
${alertLines}

=== AI 브리핑 주요 관찰 ===
${briefLines}

위 데이터를 바탕으로 주간 케어 보고서를 작성해주세요.
보고서 형식:

1. 이번 주 주요 현황

2. 사회 연결 상태 분석

3. 주요 이벤트 및 대응

4. 다음 주 권고 사항

5. 직접 연락 필요 여부: [필요/불필요]
   (사유: )`;
}
