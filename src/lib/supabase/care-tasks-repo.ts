import type { SupabaseClient } from "@supabase/supabase-js";

export type CareTaskInsert = {
  owner_user_id: string;
  parent_id: string;
  target_person: string;
  original_request: string;
  status: "scheduled";
  priority: "normal";
  task_type?: string;
};

export type MessageLogInsert = {
  owner_user_id: string;
  parent_id: string;
  care_task_id: string;
  direction: "inbound";
  status: "received";
  sender: string;
  receiver: string;
  raw_message: string;
  source_channel: "web";
};

// RLS가 select를 owner_user_id 기준으로 이미 걸러주므로, "0건이면 내 소유가 아니다"로 소유권을 판단한다.
export async function isOwnParentProfile(supabase: SupabaseClient, parentId: string): Promise<boolean> {
  const { data, error } = await supabase.from("parent_profiles").select("id").eq("id", parentId).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export type CareTaskRow = {
  id: string;
  owner_user_id: string;
  parent_id: string;
  target_person: string | null;
  original_request: string | null;
  status: string;
};

export type CareTaskSummary = {
  id: string;
  parent_id: string;
  target_person: string | null;
  original_request: string | null;
  status: string;
  priority: string | null;
  task_type: string | null;
  completed_at: string | null;
  notification_status: string | null;
  created_at: string;
};

// /delivery-preview의 드롭다운, /dashboard/tasks의 일정 목록 둘 다 이 함수를 쓴다. RLS가 owner_user_id로
// 이미 필터링해주므로 별도 조건 없이 전체 조회한다.
export async function listCareTasks(supabase: SupabaseClient): Promise<CareTaskSummary[]> {
  const { data, error } = await supabase
    .from("care_tasks")
    .select(
      "id, parent_id, target_person, original_request, status, priority, task_type, completed_at, notification_status, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CareTaskSummary[];
}

// isOwnParentProfile과 같은 RLS 의존 패턴이지만, /api/delivery/preview에서 parent_id를 바로 써야 하므로
// boolean이 아니라 행 자체(또는 null)를 반환한다 — 소유권 확인과 parent_id 조회를 한 번의 쿼리로 끝낸다.
export async function getOwnCareTask(supabase: SupabaseClient, careTaskId: string): Promise<CareTaskRow | null> {
  const { data, error } = await supabase
    .from("care_tasks")
    .select("id, owner_user_id, parent_id, target_person, original_request, status")
    .eq("id", careTaskId)
    .maybeSingle();
  if (error) throw error;
  return data as CareTaskRow | null;
}

// Day9의 respond_to_notification SQL 함수와 같은 상태 매핑을, 인증된 회원 본인이 호출하는
// /api/care-calls/[attemptId]/respond에서는 일반 RLS-인증 경로로 처리한다(SQL 함수 불필요).
export async function updateCareTaskStatus(
  supabase: SupabaseClient,
  id: string,
  patch: { status: string; completed_at?: string | null }
): Promise<void> {
  const { error } = await supabase.from("care_tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createCareTask(
  supabase: SupabaseClient,
  input: CareTaskInsert
): Promise<{ id: string }> {
  const { data, error } = await supabase.from("care_tasks").insert(input).select("id").single();
  if (error) throw error;
  return data as { id: string };
}

export async function createMessageLog(
  supabase: SupabaseClient,
  input: MessageLogInsert
): Promise<{ id: string }> {
  const { data, error } = await supabase.from("message_logs").insert(input).select("id").single();
  if (error) throw error;
  return data as { id: string };
}
