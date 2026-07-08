import type { SupabaseClient } from "@supabase/supabase-js";

export const CARE_PLAN_SYSTEM_PROMPT = `당신은 한국 노인 복지 실무 전문가입니다.
제공된 어르신 4주치 돌봄 데이터를 바탕으로, 사회복지사 또는 가족이 다음 주에 실행할 수 있는 구체적인 케어 플랜 초안을 작성해주세요.

[작성 규칙]
- 반드시 아래 5개 섹션 순서대로 작성
- 의학적 진단·처방·확정적 판단 금지 — 관찰 사실과 경향만 기술
- 각 목표와 활동은 실제로 실행 가능한 구체적 내용으로 작성
- 마지막 섹션에서 "직접 연락 필요 여부"를 [필요] 또는 [불필요]로 명시하고 한 줄 사유 기재
- 각 섹션 제목은 "1. 현황 요약" 형식으로 유지`;

const STATUS_KO: Record<string, string> = {
  completed: "완료",
  help_requested: "도움 요청",
  no_answer: "미응답",
  in_progress: "진행 중",
  prepared: "준비됨",
};

export async function buildCarePlanPrompt(
  supabase: SupabaseClient,
  parentId: string,
  userId: string
): Promise<string | null> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const fromDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const nextMonday = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  })();
  const nextSunday = (() => {
    const d = new Date(nextMonday);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const [profileResult, scoresResult, callsResult, alertsResult] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("display_name, relationship, daily_routine, medication_notes, communication_style")
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
      .select("status, summary, created_at")
      .eq("parent_id", parentId)
      .eq("owner_user_id", userId)
      .gte("created_at", fourWeeksAgo)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("safety_alerts")
      .select("severity, title, description, acknowledged_at")
      .eq("elder_id", parentId)
      .eq("owner_user_id", userId)
      .gte("generated_at", fourWeeksAgo)
      .order("generated_at", { ascending: false })
      .limit(5),
  ]);

  if (!profileResult.data) return null;

  const profile = profileResult.data as {
    display_name: string;
    relationship: string | null;
    daily_routine: string | null;
    medication_notes: string | null;
    communication_style: string | null;
  };

  const scores = (scoresResult.data ?? []) as Array<{ week_start: string; score: number; call_count: number; answered_count: number }>;
  const calls = (callsResult.data ?? []) as Array<{ status: string; summary: string | null; created_at: string }>;
  const alerts = (alertsResult.data ?? []) as Array<{ severity: string; title: string; description: string; acknowledged_at: string | null }>;

  const latestScore = scores.at(-1);
  const prevScore = scores.at(-2);
  const scoreTrend = latestScore && prevScore
    ? `현재 ${latestScore.score}점 (전주 ${prevScore.score}점 → ${latestScore.score > prevScore.score ? "▲ 상승" : latestScore.score < prevScore.score ? "▼ 하락" : "유지"})`
    : latestScore
      ? `현재 ${latestScore.score}점 (비교 없음)`
      : "점수 없음";

  const scoreLines = scores.length > 0
    ? scores.map((s) => `  - ${s.week_start} 주: ${s.score}점 (통화 ${s.call_count}회, 응답 ${s.answered_count}회)`).join("\n")
    : "  - 점수 데이터 없음";

  const callLines = calls.length > 0
    ? calls.slice(0, 6).map((c) => {
        const date = new Date(c.created_at).toLocaleDateString("ko-KR");
        return `  - [${date}] ${STATUS_KO[c.status] ?? c.status}${c.summary ? ` — ${c.summary.slice(0, 60)}` : ""}`;
      }).join("\n")
    : "  - 통화 기록 없음";

  const alertLines = alerts.length > 0
    ? alerts.slice(0, 3).map((a) =>
        `  - [${a.severity}] ${a.title} (${a.acknowledged_at ? "확인됨" : "미확인"})`
      ).join("\n")
    : "  - 안전 알림 없음";

  return `대상자: ${profile.display_name}${profile.relationship ? ` (${profile.relationship})` : ""}
케어 플랜 기간: ${nextMonday} ~ ${nextSunday} (다음 주)
작성 기준일: ${today}

=== 생활 패턴 ===
  - 일과: ${profile.daily_routine ?? "미입력"}
  - 복약: ${profile.medication_notes ?? "미입력"}
  - 소통 방식: ${profile.communication_style ?? "미입력"}

=== 사회 연결 점수 추이 (4주) ===
${scoreLines}
종합: ${scoreTrend}

=== 안부전화 이력 ===
${callLines}

=== 안전 알림 ===
${alertLines}

위 데이터를 바탕으로 다음 주 케어 플랜을 작성해주세요.
플랜 형식:

1. 현황 요약

2. 다음 주 케어 목표 (최대 3개)

3. 케어 활동 제안

4. 유의사항 및 모니터링 포인트

5. 직접 연락 필요 여부: [필요/불필요]
   (사유: )`;
}
