import type { SupabaseClient } from "@supabase/supabase-js";

export type PushSubscription = {
  id: string;
  owner_user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export async function upsertPushSubscription(
  supabase: SupabaseClient,
  input: { owner_user_id: string; endpoint: string; p256dh: string; auth: string }
): Promise<PushSubscription> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(input, { onConflict: "endpoint" })
    .select("*")
    .single();
  if (error) throw error;
  return data as PushSubscription;
}

export async function listPushSubscriptions(
  supabase: SupabaseClient
): Promise<PushSubscription[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*");
  if (error) return [];
  return (data ?? []) as PushSubscription[];
}

export async function deletePushSubscription(
  supabase: SupabaseClient,
  endpoint: string
): Promise<void> {
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
}
