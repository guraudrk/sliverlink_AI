import type { SupabaseClient } from "@supabase/supabase-js";

export type CareTaskInsert = {
  owner_user_id: string;
  parent_id: string;
  target_person: string;
  original_request: string;
  status: "scheduled";
  priority: "normal";
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
