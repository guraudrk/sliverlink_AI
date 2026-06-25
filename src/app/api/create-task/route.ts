import { ZodError } from "zod";
import { getSilverLinkEnv } from "@/lib/silverlink/env";
import { sendToMakeWebhook } from "@/lib/silverlink/make-client";
import { buildSilverLinkPayload } from "@/lib/silverlink/payload";
import { createCareTask, createMessageLog, isOwnParentProfile } from "@/lib/supabase/care-tasks-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  });
}
