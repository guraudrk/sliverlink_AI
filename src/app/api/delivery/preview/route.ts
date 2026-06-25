import { ZodError } from "zod";
import { notificationQueueInputSchema } from "@/lib/silverlink/delivery/schema";
import { generateResponseToken, getDefaultExpiresAt } from "@/lib/silverlink/delivery/response-token";
import { MockDeliveryProvider } from "@/lib/silverlink/delivery/mock-provider";
import { getOwnCareTask } from "@/lib/supabase/care-tasks-repo";
import { createNotificationQueueEntry } from "@/lib/supabase/notification-queue-repo";
import { createDeliveryAttempt } from "@/lib/supabase/delivery-attempts-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const mockProvider = new MockDeliveryProvider();

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  let input;
  try {
    input = notificationQueueInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  let careTask;
  try {
    careTask = await getOwnCareTask(supabase, input.care_task_id);
  } catch {
    return jsonResponse({ ok: false, error: "ownership_check_failed" }, 500);
  }
  if (!careTask) {
    // 존재하지 않는 care_task_id와 "남의 care_task" id를 구분하지 않는다 — RLS가 이미 본인 소유 행만
    // 보여주므로, 둘 다 그 회원 입장에서는 "내 것이 아닌 care_task_id"로 동일하게 거부한다.
    return jsonResponse({ ok: false, error: "care_task_not_found" }, 403);
  }

  const responseToken = generateResponseToken();
  const queueInput = { ...input, expires_at: input.expires_at ?? getDefaultExpiresAt() };

  try {
    const queue = await createNotificationQueueEntry(
      supabase,
      userData.user.id,
      careTask.parent_id,
      responseToken,
      queueInput
    );

    const deliveryResult = await mockProvider.send({
      channel: input.channel,
      message_text: input.message_text,
      call_script: input.call_script,
    });

    const attempt = await createDeliveryAttempt(supabase, {
      owner_user_id: userData.user.id,
      parent_id: careTask.parent_id,
      queue_id: queue.id,
      provider: deliveryResult.provider,
      channel: input.channel,
      request_payload: deliveryResult.request_payload,
      response_payload: deliveryResult.response_payload,
      status: deliveryResult.status,
      external_message_id: deliveryResult.external_message_id,
      error_code: deliveryResult.error_code,
      error_message: deliveryResult.error_message,
    });

    return jsonResponse({ ok: true, queue, deliveryAttemptId: attempt.id, deliveryStatus: deliveryResult.status });
  } catch {
    return jsonResponse({ ok: false, error: "save_failed" }, 500);
  }
}
