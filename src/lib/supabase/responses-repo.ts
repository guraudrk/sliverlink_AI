import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationByToken = {
  id: string;
  channel: string;
  message_text: string | null;
  call_script: string | null;
  status: string;
  expires_at: string | null;
  target_person: string | null;
};

// 어르신은 로그인하지 않으므로 RLS를 타지 않는 SECURITY DEFINER 함수(get_notification_by_token)를
// rpc로 호출한다 — 토큰과 정확히 일치하는 한 행만 돌아온다.
export async function getNotificationByToken(
  supabase: SupabaseClient,
  token: string
): Promise<NotificationByToken | null> {
  const { data, error } = await supabase.rpc("get_notification_by_token", { p_token: token });
  if (error) throw error;
  const rows = (data ?? []) as NotificationByToken[];
  return rows[0] ?? null;
}

export type RespondResult =
  | { ok: true; action: string; care_task_status: string | null }
  | { ok: false; error: "not_found" | "expired" | "already_responded" | "invalid_action" };

export async function respondToNotification(
  supabase: SupabaseClient,
  token: string,
  action: string
): Promise<RespondResult> {
  const { data, error } = await supabase.rpc("respond_to_notification", { p_token: token, p_action: action });
  if (error) throw error;
  return data as RespondResult;
}
