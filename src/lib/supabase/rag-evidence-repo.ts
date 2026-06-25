import type { SupabaseClient } from "@supabase/supabase-js";

export type RagParentProfileRow = {
  id: string;
  display_name: string;
  care_context: string | null;
  daily_routine: string | null;
  medication_notes: string | null;
  communication_style: string | null;
};

export type RagCareTaskRow = {
  id: string;
  parent_id: string;
  original_request: string | null;
  status: string;
  priority: string | null;
  created_at: string;
};

export type RagMessageLogRow = {
  id: string;
  parent_id: string | null;
  raw_message: string | null;
  direction: string | null;
  created_at: string;
};

export type RagNotificationQueueRow = {
  id: string;
  parent_id: string;
  channel: string;
  status: string;
  expires_at: string | null;
  created_at: string;
};

export type RagCareCallAttemptRow = {
  id: string;
  parent_id: string;
  status: string;
  call_script: string | null;
  parent_response: string | null;
  risk_level: string;
  created_at: string;
};

export type RagDeliveryAttemptRow = {
  id: string;
  parent_id: string;
  provider: string;
  channel: string;
  status: string;
  attempted_at: string;
};

export type RagEvidenceSourceRows = {
  parentProfiles: RagParentProfileRow[];
  careTasks: RagCareTaskRow[];
  messageLogs: RagMessageLogRow[];
  notificationQueue: RagNotificationQueueRow[];
  careCallAttempts: RagCareCallAttemptRow[];
  deliveryAttempts: RagDeliveryAttemptRow[];
};

function cutoffIso(timeWindowDays: number): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - timeWindowDays);
  return cutoff.toISOString();
}

// owner_user_id는 RLS(auth.uid() = owner_user_id)가 이미 걸러주므로 여기서 별도로 필터하지 않는다
// (다른 repo 함수들과 동일한 패턴). parent_profiles는 시점성이 없는 배경 정보라 시간창을 적용하지 않는다.
export async function fetchRagEvidenceSourceRows(
  supabase: SupabaseClient,
  options: { parentId?: string; timeWindowDays: number }
): Promise<RagEvidenceSourceRows> {
  const { parentId, timeWindowDays } = options;
  const cutoff = cutoffIso(timeWindowDays);

  let profileQuery = supabase
    .from("parent_profiles")
    .select("id, display_name, care_context, daily_routine, medication_notes, communication_style");
  if (parentId) profileQuery = profileQuery.eq("id", parentId);

  let careTaskQuery = supabase
    .from("care_tasks")
    .select("id, parent_id, original_request, status, priority, created_at")
    .gte("created_at", cutoff);
  if (parentId) careTaskQuery = careTaskQuery.eq("parent_id", parentId);

  let messageLogQuery = supabase
    .from("message_logs")
    .select("id, parent_id, raw_message, direction, created_at")
    .gte("created_at", cutoff);
  if (parentId) messageLogQuery = messageLogQuery.eq("parent_id", parentId);

  let queueQuery = supabase
    .from("notification_queue")
    .select("id, parent_id, channel, status, expires_at, created_at")
    .gte("created_at", cutoff);
  if (parentId) queueQuery = queueQuery.eq("parent_id", parentId);

  let callAttemptQuery = supabase
    .from("care_call_attempts")
    .select("id, parent_id, status, call_script, parent_response, risk_level, created_at")
    .gte("created_at", cutoff);
  if (parentId) callAttemptQuery = callAttemptQuery.eq("parent_id", parentId);

  let deliveryAttemptQuery = supabase
    .from("delivery_attempts")
    .select("id, parent_id, provider, channel, status, attempted_at")
    .gte("attempted_at", cutoff);
  if (parentId) deliveryAttemptQuery = deliveryAttemptQuery.eq("parent_id", parentId);

  const [profiles, careTasks, messageLogs, queue, callAttempts, deliveryAttempts] = await Promise.all([
    profileQuery,
    careTaskQuery,
    messageLogQuery,
    queueQuery,
    callAttemptQuery,
    deliveryAttemptQuery,
  ]);

  for (const result of [profiles, careTasks, messageLogs, queue, callAttempts, deliveryAttempts]) {
    if (result.error) throw result.error;
  }

  return {
    parentProfiles: (profiles.data ?? []) as RagParentProfileRow[],
    careTasks: (careTasks.data ?? []) as RagCareTaskRow[],
    messageLogs: (messageLogs.data ?? []) as RagMessageLogRow[],
    notificationQueue: (queue.data ?? []) as RagNotificationQueueRow[],
    careCallAttempts: (callAttempts.data ?? []) as RagCareCallAttemptRow[],
    deliveryAttempts: (deliveryAttempts.data ?? []) as RagDeliveryAttemptRow[],
  };
}
