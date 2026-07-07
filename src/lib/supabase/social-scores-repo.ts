import type { SupabaseClient } from "@supabase/supabase-js";

export type SocialScore = {
  id: string;
  owner_user_id: string;
  parent_id: string;
  week_start: string; // "YYYY-MM-DD" (Monday)
  score: number;
  call_count: number;
  answered_count: number;
  response_count: number;
  created_at: string;
  updated_at: string;
};

export type SocialScoreUpsert = {
  owner_user_id: string;
  parent_id: string;
  week_start: string;
  score: number;
  call_count: number;
  answered_count: number;
  response_count: number;
};

/** 최근 N주치 점수를 week_start 내림차순으로 반환 */
export async function listSocialScores(
  supabase: SupabaseClient,
  parentId: string,
  weeks = 8
): Promise<SocialScore[]> {
  const { data, error } = await supabase
    .from("social_scores")
    .select("*")
    .eq("parent_id", parentId)
    .order("week_start", { ascending: false })
    .limit(weeks);
  if (error) throw error;
  return (data ?? []) as SocialScore[];
}

/** 현재 주 점수 upsert (week_start 기준 충돌 시 덮어쓰기) */
export async function upsertSocialScore(
  supabase: SupabaseClient,
  input: SocialScoreUpsert
): Promise<SocialScore> {
  const { data, error } = await supabase
    .from("social_scores")
    .upsert(input, { onConflict: "owner_user_id,parent_id,week_start" })
    .select("*")
    .single();
  if (error) throw error;
  return data as SocialScore;
}

/** parent_id 목록 전체의 최신 주 점수를 한 번에 조회 */
export async function listLatestSocialScores(
  supabase: SupabaseClient
): Promise<SocialScore[]> {
  // 각 parent별로 가장 최신 1건씩 — distinct on은 Supabase JS에서 직접 지원 안 해
  // 전체를 내려받아 JS 레벨에서 dedup하는 방식
  const { data, error } = await supabase
    .from("social_scores")
    .select("*")
    .order("week_start", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SocialScore[];

  // parent_id 당 첫 번째(=최신) 행만 유지
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.parent_id)) return false;
    seen.add(r.parent_id);
    return true;
  });
}
