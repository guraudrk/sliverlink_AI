import { ZodError } from "zod";
import { createCallAttemptInputSchema } from "@/lib/silverlink/calls/schema";
import { buildCallScript, formatCallScriptText } from "@/lib/silverlink/calls/call-script-builder";
import { getOwnCareTask } from "@/lib/supabase/care-tasks-repo";
import { getParentProfileById } from "@/lib/supabase/parent-profiles-repo";
import { createCareCallAttempt } from "@/lib/supabase/care-call-attempts-repo";
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

  let input;
  try {
    input = createCallAttemptInputSchema.parse(body);
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
    return jsonResponse({ ok: false, error: "care_task_not_found" }, 403);
  }

  let profile;
  try {
    profile = await getParentProfileById(supabase, careTask.parent_id);
  } catch {
    return jsonResponse({ ok: false, error: "profile_lookup_failed" }, 500);
  }
  if (!profile) {
    return jsonResponse({ ok: false, error: "parent_not_found" }, 404);
  }

  const script = buildCallScript(profile, careTask);

  try {
    const attempt = await createCareCallAttempt(supabase, {
      owner_user_id: userData.user.id,
      parent_id: careTask.parent_id,
      care_task_id: careTask.id,
      call_script: formatCallScriptText(script),
    });
    return jsonResponse({ ok: true, attempt, script });
  } catch {
    return jsonResponse({ ok: false, error: "save_failed" }, 500);
  }
}
