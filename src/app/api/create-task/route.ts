import { z, ZodError } from "zod";
import { getSilverLinkEnv } from "@/lib/silverlink/env";
import { sendToMakeWebhook } from "@/lib/silverlink/make-client";
import { buildSilverLinkPayload } from "@/lib/silverlink/payload";
import { createCareTask, createMessageLog, isOwnParentProfile } from "@/lib/supabase/care-tasks-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classifyTaskType, TASK_TYPE_OPTIONS } from "@/lib/silverlink/care-tasks/task-type";

// task_type은 웹훅 payload(buildSilverLinkPayload)와는 별도로 다룬다 — Make 시나리오로 나가는 외부 계약은
// 그대로 두고, DB에만 저장하는 관리용 메타데이터이기 때문이다. 사용자가 직접 고르지 않으면(필드 누락/빈 값)
// classifyTaskType으로 자동 분류한다.
const taskTypeFieldSchema = z.enum(TASK_TYPE_OPTIONS).optional();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

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

  let payload;
  try {
    payload = buildSilverLinkPayload(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  const rawTaskType = typeof body === "object" && body !== null ? (body as Record<string, unknown>).task_type : undefined;
  let taskType: (typeof TASK_TYPE_OPTIONS)[number];
  try {
    taskType = taskTypeFieldSchema.parse(rawTaskType) ?? classifyTaskType(payload.message);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  let owns: boolean;
  try {
    owns = await isOwnParentProfile(supabase, payload.target_person_id);
  } catch {
    return jsonResponse({ ok: false, error: "ownership_check_failed" }, 500);
  }
  if (!owns) {
    // 존재하지 않는 id와 "남의 parent_profiles" id를 구분하지 않는다 — RLS가 이미 본인 소유 행만 보여주므로,
    // 둘 다 그 회원 입장에서는 "내 것이 아닌 parent_id"로 동일하게 거부한다.
    return jsonResponse({ ok: false, error: "parent_not_found" }, 403);
  }

  let careTaskId: string;
  let messageLogId: string;
  try {
    const careTask = await createCareTask(supabase, {
      owner_user_id: userData.user.id,
      parent_id: payload.target_person_id,
      target_person: payload.target_person,
      original_request: payload.message,
      status: "scheduled",
      priority: "normal",
      task_type: taskType,
    });
    careTaskId = careTask.id;

    const messageLog = await createMessageLog(supabase, {
      owner_user_id: userData.user.id,
      parent_id: payload.target_person_id,
      care_task_id: careTaskId,
      direction: "inbound",
      status: "received",
      sender: payload.sender_name,
      receiver: payload.target_person,
      raw_message: payload.message,
      source_channel: "web",
    });
    messageLogId = messageLog.id;
  } catch {
    return jsonResponse({ ok: false, error: "save_failed" }, 500);
  }

  const { legacyMakeSyncEnabled } = getSilverLinkEnv();
  let legacyMakeCalled = false;

  if (legacyMakeSyncEnabled) {
    // Make 호출이 실패해도 Supabase insert는 이미 성공했으므로, 응답을 막지 않고 legacyMakeCalled만 false로 둔다.
    const result = await sendToMakeWebhook(payload);
    legacyMakeCalled = result.ok && !result.dryRun;
  }

  return jsonResponse({
    ok: true,
    savedToSupabase: true,
    legacyMakeCalled,
    careTaskId,
    messageLogId,
    taskType,
  });
}
