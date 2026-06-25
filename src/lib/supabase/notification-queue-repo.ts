import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationQueueInput } from "@/lib/silverlink/delivery/schema";

export type NotificationQueueRow = NotificationQueueInput & {
  id: string;
  owner_user_id: string;
  parent_id: string;
  response_token: string;
  status: string;
  created_at: string;
};

// owner_user_id/parent_id는 항상 서버가 (인증된 user.id, care_task 소유권 검증으로 얻은 parent_id)로 설정한다.
export async function createNotificationQueueEntry(
  supabase: SupabaseClient,
  ownerUserId: string,
  parentId: string,
  responseToken: string,
  input: NotificationQueueInput
): Promise<NotificationQueueRow> {
  const { data, error } = await supabase
    .from("notification_queue")
    .insert({
      ...input,
      owner_user_id: ownerUserId,
      parent_id: parentId,
      response_token: responseToken,
      status: "prepared",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as NotificationQueueRow;
}

export async function listNotificationQueue(supabase: SupabaseClient): Promise<NotificationQueueRow[]> {
  const { data, error } = await supabase
    .from("notification_queue")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as NotificationQueueRow[];
}
