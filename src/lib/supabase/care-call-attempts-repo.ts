import type { SupabaseClient } from "@supabase/supabase-js";

export type CareCallAttempt = {
  id: string;
  owner_user_id: string;
  parent_id: string;
  care_task_id: string | null;
  schedule_id: string | null;
  provider: string;
  status: string;
  call_script: string | null;
  parent_response: string | null;
  transcript: string | null;
  summary: string | null;
  risk_level: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type CareCallAttemptInsert = {
  owner_user_id: string;
  parent_id: string;
  care_task_id: string;
  call_script: string;
};

export async function createCareCallAttempt(
  supabase: SupabaseClient,
  input: CareCallAttemptInsert
): Promise<CareCallAttempt> {
  const { data, error } = await supabase
    .from("care_call_attempts")
    .insert({ ...input, provider: "mock", status: "prepared" })
    .select("*")
    .single();
  if (error) throw error;
  return data as CareCallAttempt;
}

// getOwnCareTask와 동일한 패턴 — RLS가 0건으로 막아주는 것을 그대로 "내 소유 아님"으로 해석한다.
export async function getOwnCareCallAttempt(supabase: SupabaseClient, id: string): Promise<CareCallAttempt | null> {
  const { data, error } = await supabase.from("care_call_attempts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as CareCallAttempt | null;
}

export async function updateCareCallAttempt(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<
    Pick<CareCallAttempt, "status" | "parent_response" | "transcript" | "summary" | "risk_level" | "started_at" | "ended_at">
  >
): Promise<CareCallAttempt> {
  const { data, error } = await supabase
    .from("care_call_attempts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CareCallAttempt;
}

export async function listCareCallAttempts(supabase: SupabaseClient): Promise<CareCallAttempt[]> {
  const { data, error } = await supabase
    .from("care_call_attempts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CareCallAttempt[];
}
