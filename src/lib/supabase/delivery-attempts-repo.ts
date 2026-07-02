import type { SupabaseClient } from "@supabase/supabase-js";

export type DeliveryAttemptInsert = {
  owner_user_id: string;
  parent_id: string;
  queue_id: string;
  provider: string;
  channel: string;
  request_payload: unknown;
  response_payload: unknown;
  status: string;
  external_message_id?: string;
  error_code?: string;
  error_message?: string;
};

export type DeliveryAttempt = DeliveryAttemptInsert & {
  id: string;
  created_at: string;
};

export async function createDeliveryAttempt(
  supabase: SupabaseClient,
  input: DeliveryAttemptInsert
): Promise<{ id: string }> {
  const { data, error } = await supabase.from("delivery_attempts").insert(input).select("id").single();
  if (error) throw error;
  return data as { id: string };
}

// RLS가 소유권을 보장한다 — 내 것이 아니면 null 반환
export async function getDeliveryAttemptById(
  supabase: SupabaseClient,
  id: string
): Promise<DeliveryAttempt | null> {
  const { data, error } = await supabase.from("delivery_attempts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as DeliveryAttempt | null;
}

export async function updateDeliveryAttemptStatus(
  supabase: SupabaseClient,
  id: string,
  patch: { status: string; response_payload?: unknown }
): Promise<void> {
  const { error } = await supabase.from("delivery_attempts").update(patch).eq("id", id);
  if (error) throw error;
}
