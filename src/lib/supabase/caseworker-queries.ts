import type { SupabaseClient } from "@supabase/supabase-js";

export type ElderSummary = {
  id: string;
  display_name: string;
  relationship: string | null;
  /** 최신 주 연결 점수 (데이터 없으면 null) */
  latestScore: number | null;
  latestWeekStart: string | null;
  /** 직전 주 연결 점수 — 추세 계산용 */
  prevScore: number | null;
  /** 최근 3건 통화 status (created_at 내림차순) */
  recentCallStatuses: string[];
  /** 미확인 안전 알림 수 */
  unackedAlertCount: number;
};

/**
 * 담당 어르신 전체의 요약 데이터를 4개 배치 쿼리로 가져온다.
 * 모든 쿼리는 RLS를 통해 owner_user_id = auth.uid() 로 자동 필터된다.
 */
export async function listElderSummaries(
  supabase: SupabaseClient
): Promise<ElderSummary[]> {
  // 1. 어르신 목록
  const { data: parents, error: pErr } = await supabase
    .from("parent_profiles")
    .select("id, display_name, relationship")
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;
  if (!parents || parents.length === 0) return [];

  const parentIds = parents.map((p: { id: string }) => p.id);

  // 2-4: 병렬 조회
  const [scoresResult, callsResult, alertsResult] = await Promise.all([
    // 사회 연결 점수 (전체, 최신순) — JS에서 parent별 최신 2건 추출
    supabase
      .from("social_scores")
      .select("parent_id, score, week_start")
      .in("parent_id", parentIds)
      .order("week_start", { ascending: false }),

    // 최근 14일 통화 이력
    supabase
      .from("care_call_attempts")
      .select("parent_id, status, created_at")
      .in("parent_id", parentIds)
      .gte(
        "created_at",
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("created_at", { ascending: false }),

    // 미확인 안전 알림 (elder_id는 parent_profiles.id와 동일)
    supabase
      .from("safety_alerts")
      .select("elder_id")
      .in("elder_id", parentIds)
      .is("acknowledged_at", null),
  ]);

  if (scoresResult.error) throw scoresResult.error;
  if (callsResult.error) throw callsResult.error;
  if (alertsResult.error) throw alertsResult.error;

  const allScores = (scoresResult.data ?? []) as Array<{
    parent_id: string;
    score: number;
    week_start: string;
  }>;
  const allCalls = (callsResult.data ?? []) as Array<{
    parent_id: string;
    status: string;
    created_at: string;
  }>;
  const allAlerts = (alertsResult.data ?? []) as Array<{ elder_id: string }>;

  // parent별 최신 2건 점수 추출 (이미 week_start 내림차순으로 정렬됨)
  const scoresByParent = new Map<string, Array<{ score: number; week_start: string }>>();
  for (const row of allScores) {
    const existing = scoresByParent.get(row.parent_id) ?? [];
    if (existing.length < 2) {
      existing.push({ score: row.score, week_start: row.week_start });
      scoresByParent.set(row.parent_id, existing);
    }
  }

  // parent별 미확인 알림 수
  const alertCountByParent = new Map<string, number>();
  for (const alert of allAlerts) {
    alertCountByParent.set(
      alert.elder_id,
      (alertCountByParent.get(alert.elder_id) ?? 0) + 1
    );
  }

  return parents.map((parent: { id: string; display_name: string; relationship: string | null }) => {
    const scores = scoresByParent.get(parent.id) ?? [];
    const recentCalls = allCalls
      .filter((c) => c.parent_id === parent.id)
      .slice(0, 3)
      .map((c) => c.status);

    return {
      id: parent.id,
      display_name: parent.display_name,
      relationship: parent.relationship,
      latestScore: scores[0]?.score ?? null,
      latestWeekStart: scores[0]?.week_start ?? null,
      prevScore: scores[1]?.score ?? null,
      recentCallStatuses: recentCalls,
      unackedAlertCount: alertCountByParent.get(parent.id) ?? 0,
    };
  });
}
