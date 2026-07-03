import type { SupabaseClient } from "@supabase/supabase-js";
// 이 파일은 action-tools.ts(@google/genai 사용)와 같은 그래프에서 import되는데, 그 조합에서
// "@/" 절대경로가 Vitest에 안 잡히는 문제가 있어(Slice 8에서 처음 발견) 상대경로로 쓴다.
import { buildCallScript, formatCallScriptText } from "../calls/call-script-builder";
import { generateResponseToken, getDefaultExpiresAt } from "../delivery/response-token";
import { MockDeliveryProvider } from "../delivery/mock-provider";
import { SolapiSmsProvider } from "../delivery/solapi-provider";
import { SolapiVoiceProvider } from "../delivery/solapi-voice-provider";
import { createCareTask, createMessageLog, getOwnCareTask, updateCareTaskNotificationStatus } from "../../supabase/care-tasks-repo";
import { getParentProfileById } from "../../supabase/parent-profiles-repo";
import { createCareCallAttempt, updateCareCallAttempt } from "../../supabase/care-call-attempts-repo";
import { createNotificationQueueEntry } from "../../supabase/notification-queue-repo";
import { createDeliveryAttempt } from "../../supabase/delivery-attempts-repo";
import { classifyTaskType, type TaskType } from "../care-tasks/task-type";
import type { RagActionIntent } from "./action-tools";

export type RagActionResult =
  | { type: "request_mock_call"; ok: true; attemptId: string }
  | { type: "send_care_message"; ok: true; deliveryAttemptId: string; deliveryStatus: string; channel: string }
  | { type: "create_care_task"; ok: true; careTaskId: string; taskType: TaskType; originalRequest: string }
  | { ok: false; error: "care_task_not_found" | "parent_not_found" | "execution_failed" };

const mockDeliveryProvider = new MockDeliveryProvider();
const solapiSmsProvider = new SolapiSmsProvider();
const solapiVoiceProvider = new SolapiVoiceProvider();
const enableRealSms = process.env.ENABLE_REAL_SMS === "true";
const enableRealCalls = process.env.ENABLE_REAL_CALLS === "true";

// decideTurn(assistant-response.ts)이 판단한 의도를 실제로 실행한다. 기존 /api/care-calls/preview+start,
// /api/delivery/preview의 로직을 그대로 재사용한다(HTTP 자기호출이 아니라 같은 repo 함수를 직접 호출) —
// 안전장치(소유권 검증, MockDeliveryProvider)를 새로 만들지 않고 이미 검증된 것을 그대로 쓴다.
export async function executeActionIntent(
  supabase: SupabaseClient,
  ownerUserId: string,
  intent: RagActionIntent
): Promise<RagActionResult> {
  if (intent.type === "request_care_call") {
    return executeRequestRealCall(supabase, ownerUserId, intent.careTaskId);
  }
  if (intent.type === "request_mock_call") {
    return executeRequestMockCall(supabase, ownerUserId, intent.careTaskId);
  }
  if (intent.type === "create_care_task") {
    return executeCreateCareTask(
      supabase,
      ownerUserId,
      intent.parentId,
      intent.senderName,
      intent.originalRequest,
      intent.taskType
    );
  }
  return executeSendCareMessage(supabase, ownerUserId, intent);
}

// /api/create-task가 하는 일(care_task insert + message_log insert)과 동일하다. 채팅에서도 "보내는 분"을
// 명시적으로 받기로 했으므로(Day14 sender_name 요구사항), 기존 웹 폼과 동일하게 message_log도 같이
// 남겨 누가 무엇을 요청했는지 기록을 남긴다 — source_channel은 "web"으로 동일하게 취급한다(채팅도
// 결국 같은 웹 대시보드 안에서 들어온 요청이라 별도 채널 값을 새로 만들지 않는다).
async function executeCreateCareTask(
  supabase: SupabaseClient,
  ownerUserId: string,
  parentId: string,
  senderName: string,
  originalRequest: string,
  explicitTaskType: TaskType | undefined
): Promise<RagActionResult> {
  try {
    const profile = await getParentProfileById(supabase, parentId);
    if (!profile) return { ok: false, error: "parent_not_found" };

    // 자녀가 유형을 직접 골랐으면 그 값을 쓰고, 아니면(자동 분류 원함) 요청 내용으로 자동 분류한다
    // — 웹 폼(/dashboard/create-task)의 "자동 분류" 기본값과 동일한 원칙.
    const taskType = explicitTaskType ?? classifyTaskType(originalRequest);

    const careTask = await createCareTask(supabase, {
      owner_user_id: ownerUserId,
      parent_id: parentId,
      target_person: profile.display_name,
      original_request: originalRequest,
      status: "scheduled",
      priority: "normal",
      task_type: taskType,
    });

    await createMessageLog(supabase, {
      owner_user_id: ownerUserId,
      parent_id: parentId,
      care_task_id: careTask.id,
      direction: "inbound",
      status: "received",
      sender: senderName,
      receiver: profile.display_name,
      raw_message: originalRequest,
      source_channel: "web",
    });

    return { type: "create_care_task", ok: true, careTaskId: careTask.id, taskType, originalRequest };
  } catch {
    return { ok: false, error: "execution_failed" };
  }
}

// "전화 걸어줘" → 실제 Solapi TTS 발신 (ENABLE_REAL_CALLS=true 일 때) — 기존 delivery 흐름 재사용.
async function executeRequestRealCall(supabase: SupabaseClient, ownerUserId: string, careTaskId: string): Promise<RagActionResult> {
  const careTask = await getOwnCareTask(supabase, careTaskId);
  if (!careTask) return { ok: false, error: "care_task_not_found" };
  const profile = await getParentProfileById(supabase, careTask.parent_id);
  if (!profile) return { ok: false, error: "parent_not_found" };
  const ttsText = formatCallScriptText(buildCallScript(profile, careTask));
  return executeSendCareMessage(supabase, ownerUserId, {
    type: "send_care_message",
    careTaskId,
    channel: "voice_call",
    messageText: ttsText,
  });
}

// "모의전화로 걸어줘" → /dashboard/calls 모의 흐름 (care_call_attempts 테이블, 실제 발신 없음).
async function executeRequestMockCall(supabase: SupabaseClient, ownerUserId: string, careTaskId: string): Promise<RagActionResult> {
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

    return { type: "request_mock_call", ok: true, attemptId: attempt.id };
  } catch {
    return { ok: false, error: "execution_failed" };
  }
}

// /api/delivery/preview와 동일한 흐름(큐 생성 → 발송 → 발송 시도 기록).
// ENABLE_REAL_SMS=true이고 channel="sms"이면 SolapiSmsProvider로 실제 발송, 아니면 Mock.
async function executeSendCareMessage(
  supabase: SupabaseClient,
  ownerUserId: string,
  intent: Extract<RagActionIntent, { type: "send_care_message" }>
): Promise<RagActionResult> {
  try {
    const careTask = await getOwnCareTask(supabase, intent.careTaskId);
    if (!careTask) return { ok: false, error: "care_task_not_found" };

    let toPhoneNumber: string | undefined;
    const useRealSms = enableRealSms && intent.channel === "sms";
    const useRealVoice = enableRealCalls && intent.channel === "voice_call";
    if (useRealSms || useRealVoice) {
      const profile = await getParentProfileById(supabase, careTask.parent_id);
      if (!profile) return { ok: false, error: "parent_not_found" };
      toPhoneNumber = profile.phone ?? undefined;
    }

    const provider =
      useRealSms ? solapiSmsProvider :
      useRealVoice ? solapiVoiceProvider :
      mockDeliveryProvider;

    const responseToken = generateResponseToken();
    const queue = await createNotificationQueueEntry(supabase, ownerUserId, careTask.parent_id, responseToken, {
      care_task_id: careTask.id,
      channel: intent.channel,
      message_text: intent.messageText,
      expires_at: getDefaultExpiresAt(),
    });

    const deliveryResult = await provider.send({
      channel: intent.channel,
      message_text: intent.messageText,
      to_phone_number: toPhoneNumber,
    });

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

    await updateCareTaskNotificationStatus(supabase, careTask.id, deliveryResult.status);

    return { type: "send_care_message", ok: true, deliveryAttemptId: attempt.id, deliveryStatus: deliveryResult.status, channel: intent.channel };
  } catch {
    return { ok: false, error: "execution_failed" };
  }
}
