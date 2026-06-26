import type { SupabaseClient } from "@supabase/supabase-js";
// 이 파일은 action-tools.ts(@google/genai 사용)와 같은 그래프에서 import되는데, 그 조합에서
// "@/" 절대경로가 Vitest에 안 잡히는 문제가 있어(Slice 8에서 처음 발견) 상대경로로 쓴다.
import { buildCallScript, formatCallScriptText } from "../calls/call-script-builder";
import { generateResponseToken, getDefaultExpiresAt } from "../delivery/response-token";
import { MockDeliveryProvider } from "../delivery/mock-provider";
import { getOwnCareTask } from "../../supabase/care-tasks-repo";
import { getParentProfileById } from "../../supabase/parent-profiles-repo";
import { createCareCallAttempt, updateCareCallAttempt } from "../../supabase/care-call-attempts-repo";
import { createNotificationQueueEntry } from "../../supabase/notification-queue-repo";
import { createDeliveryAttempt } from "../../supabase/delivery-attempts-repo";
import type { RagActionIntent } from "./action-tools";

export type RagActionResult =
  | { type: "request_care_call"; ok: true; attemptId: string }
  | { type: "send_care_message"; ok: true; deliveryAttemptId: string; deliveryStatus: string }
  | { ok: false; error: "care_task_not_found" | "parent_not_found" | "execution_failed" };

const mockDeliveryProvider = new MockDeliveryProvider();

// detectActionIntent(action-tools.ts)가 판단한 의도를 실제로 실행한다. 기존 /api/care-calls/preview+start,
// /api/delivery/preview의 로직을 그대로 재사용한다(HTTP 자기호출이 아니라 같은 repo 함수를 직접 호출) —
// 안전장치(소유권 검증, MockDeliveryProvider)를 새로 만들지 않고 이미 검증된 것을 그대로 쓴다.
export async function executeActionIntent(
  supabase: SupabaseClient,
  ownerUserId: string,
  intent: RagActionIntent
): Promise<RagActionResult> {
  if (intent.type === "request_care_call") {
    return executeRequestCareCall(supabase, ownerUserId, intent.careTaskId);
  }
  return executeSendCareMessage(supabase, ownerUserId, intent);
}

// /api/care-calls/preview + /api/care-calls/[attemptId]/start를 한 번에 수행한다. "전화 걸어줘"라는
// 명령은 통화를 거는 행위까지지, 어르신의 응답을 대신 지어내는 게 아니라서 respond 단계는 호출하지 않는다
// — 응답 확인은 기존 /dashboard/calls 화면에서 그대로 진행한다.
async function executeRequestCareCall(supabase: SupabaseClient, ownerUserId: string, careTaskId: string): Promise<RagActionResult> {
  try {
    const careTask = await getOwnCareTask(supabase, careTaskId);
    if (!careTask) return { ok: false, error: "care_task_not_found" };

    const profile = await getParentProfileById(supabase, careTask.parent_id);
    if (!profile) return { ok: false, error: "parent_not_found" };

    const script = buildCallScript(profile, careTask);
    const attempt = await createCareCallAttempt(supabase, {
      owner_user_id: ownerUserId,
      parent_id: careTask.parent_id,
      care_task_id: careTask.id,
      call_script: formatCallScriptText(script),
    });
    await updateCareCallAttempt(supabase, attempt.id, { status: "answered", started_at: new Date().toISOString() });

    return { type: "request_care_call", ok: true, attemptId: attempt.id };
  } catch {
    return { ok: false, error: "execution_failed" };
  }
}

// /api/delivery/preview와 동일한 흐름(큐 생성 → MockDeliveryProvider 발송 → 발송 시도 기록).
async function executeSendCareMessage(
  supabase: SupabaseClient,
  ownerUserId: string,
  intent: Extract<RagActionIntent, { type: "send_care_message" }>
): Promise<RagActionResult> {
  try {
    const careTask = await getOwnCareTask(supabase, intent.careTaskId);
    if (!careTask) return { ok: false, error: "care_task_not_found" };

    const responseToken = generateResponseToken();
    const queue = await createNotificationQueueEntry(supabase, ownerUserId, careTask.parent_id, responseToken, {
      care_task_id: careTask.id,
      channel: intent.channel,
      message_text: intent.messageText,
      expires_at: getDefaultExpiresAt(),
    });

    const deliveryResult = await mockDeliveryProvider.send({ channel: intent.channel, message_text: intent.messageText });

    const attempt = await createDeliveryAttempt(supabase, {
      owner_user_id: ownerUserId,
      parent_id: careTask.parent_id,
      queue_id: queue.id,
      provider: deliveryResult.provider,
      channel: intent.channel,
      request_payload: deliveryResult.request_payload,
      response_payload: deliveryResult.response_payload,
      status: deliveryResult.status,
      external_message_id: deliveryResult.external_message_id,
      error_code: deliveryResult.error_code,
      error_message: deliveryResult.error_message,
    });

    return { type: "send_care_message", ok: true, deliveryAttemptId: attempt.id, deliveryStatus: deliveryResult.status };
  } catch {
    return { ok: false, error: "execution_failed" };
  }
}
