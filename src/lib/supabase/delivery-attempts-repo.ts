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

export async function createDeliveryAttempt(
  supabase: SupabaseClient,
  input: DeliveryAttemptInsert
): Promise<{ id: string }> {
  const { data, error } = await supabase.from("delivery_attempts").insert(input).select("id").single();
  if (error) throw error;
  return data as { id: string };
}
