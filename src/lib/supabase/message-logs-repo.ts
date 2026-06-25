import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageLogSummary = {
  id: string;
  parent_id: string | null;
  care_task_id: string | null;
  sender: string | null;
  receiver: string | null;
  raw_message: string | null;
  direction: string | null;
  source_channel: string | null;
  created_at: string;
};

const RECENT_LIMIT = 100;

// /dashboard/responses, /dashboard/parents/[parentId]에서 쓴다. RLS가 owner_user_id로 이미
// 필터링해주므로 별도 조건 없이 최근 N건만 가져온다.
export async function listMessageLogs(supabase: SupabaseClient): Promise<MessageLogSummary[]> {
  const { data, error } = await supabase
    .from("message_logs")
    .select("id, parent_id, care_task_id, sender, receiver, raw_message, direction, source_channel, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) throw error;
  return (data ?? []) as MessageLogSummary[];
}
