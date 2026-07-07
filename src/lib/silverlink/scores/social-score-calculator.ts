import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertSocialScore } from "@/lib/supabase/social-scores-repo";

/** 주어진 날짜가 속한 주의 월요일을 "YYYY-MM-DD"로 반환 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // → 월요일로 이동
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * 특정 부모의 이번 주 care_call_attempts + notification responses를 집계해
 * social_scores 테이블에 upsert한다.
 *
 * respond API route에서 호출 — 실패해도 응답을 차단하지 않는다(호출부에서 catch).
 */
export async function recalculateWeekScore(
  supabase: SupabaseClient,
  ownerId: string,
  parentId: string
): Promise<void> {
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // 이번 주 care_call_attempts 집계
  const { data: callRows } = await supabase
    .from("care_call_attempts")
    .select("status, parent_response")
    .eq("owner_user_id", ownerId)
    .eq("parent_id", parentId)
    .gte("created_at", weekStart)
    .lt("created_at", weekEndStr);

  const calls = callRows ?? [];
  const callCount = calls.length;
  // completed / no_answer 외 중간 상태(prepared/in_progress)는 분모에만 포함
  const answeredCount = calls.filter(
    (c) => c.status === "completed" && c.parent_response !== "no_answer"
  ).length;

  // 이번 주 링크 응답 (completed / help_requested)
  const { data: respRows } = await supabase
    .from("notification_queue")
    .select("status")
    .eq("owner_user_id", ownerId)
    .eq("parent_id", parentId)
    .in("status", ["responded"])
    .gte("created_at", weekStart)
    .lt("created_at", weekEndStr);

  const responseCount = (respRows ?? []).length;

  // 점수 계산 (0-100)
  const callScore = callCount > 0 ? (answeredCount / callCount) * 70 : 0;
  const responseScore = Math.min(responseCount, 3) * 10;
  const score = Math.round(callScore + responseScore);

  await upsertSocialScore(supabase, {
    owner_user_id: ownerId,
    parent_id: parentId,
    week_start: weekStart,
    score,
    call_count: callCount,
    answered_count: answeredCount,
    response_count: responseCount,
  });
}
