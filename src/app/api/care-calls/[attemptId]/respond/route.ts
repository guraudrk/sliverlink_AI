import { ZodError } from "zod";
import { respondCallAttemptInputSchema } from "@/lib/silverlink/calls/schema";
import { getOwnCareCallAttempt, updateCareCallAttempt } from "@/lib/supabase/care-call-attempts-repo";
import { updateCareTaskStatus } from "@/lib/supabase/care-tasks-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateFamilyBrief } from "@/lib/silverlink/calls/family-brief-generator";
import { createCallFamilyBrief } from "@/lib/supabase/call-family-briefs-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const RESPONSE_LABELS: Record<string, string> = {
  completed: "완료했어요",
  help_requested: "도움이 필요해요",
  no_answer: "응답이 없었어요",
};

const RISK_LEVELS: Record<string, string> = {
  completed: "none",
  help_requested: "medium",
  no_answer: "low",
};

const CARE_TASK_STATUS: Record<string, string> = {
  completed: "completed",
  help_requested: "help_requested",
  // no_answer는 일정 상태를 바꾸지 않는다 — 다시 시도할 수 있는 상태로 그대로 둔다.
};

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
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
    input = respondCallAttemptInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  let attempt;
  try {
    attempt = await getOwnCareCallAttempt(supabase, attemptId);
  } catch {
    return jsonResponse({ ok: false, error: "ownership_check_failed" }, 500);
  }
  if (!attempt) {
    return jsonResponse({ ok: false, error: "attempt_not_found" }, 404);
  }
  if (attempt.status === "completed" || attempt.status === "help_requested" || attempt.status === "no_answer") {
    return jsonResponse({ ok: false, error: "already_responded" }, 409);
  }

  const label = RESPONSE_LABELS[input.action];

  try {
    const updated = await updateCareCallAttempt(supabase, attemptId, {
      status: input.action,
      parent_response: label,
      transcript: `${attempt.call_script ?? ""}\n어르신 응답: ${label}`,
      summary: `안부전화 결과: ${label}`,
      risk_level: RISK_LEVELS[input.action],
      ended_at: new Date().toISOString(),
    });

    const careTaskStatus = CARE_TASK_STATUS[input.action];
    if (careTaskStatus && attempt.care_task_id) {
      await updateCareTaskStatus(supabase, attempt.care_task_id, {
        status: careTaskStatus,
        completed_at: careTaskStatus === "completed" ? new Date().toISOString() : null,
      });
    }

    // 완료/도움요청 시 가족 브리핑 생성 (no_answer는 어르신 응답 없으므로 생략)
    let brief = null;
    if (updated.call_script && input.action !== "no_answer") {
      try {
        const briefResult = await generateFamilyBrief(
          updated.call_script,
          updated.parent_response,
          updated.status
        );
        if (briefResult) {
          brief = await createCallFamilyBrief(supabase, {
            call_id: updated.id,
            elder_id: updated.parent_id,
            owner_user_id: userData.user.id,
            mind_points: briefResult.mind_points,
            conversation_starters: briefResult.conversation_starters,
            attention_item: briefResult.attention_item,
          });
        }
      } catch {
        // 브리핑 생성 실패는 통화 응답 자체를 막지 않는다
      }
    }

    return jsonResponse({ ok: true, attempt: updated, brief });
  } catch {
    return jsonResponse({ ok: false, error: "update_failed" }, 500);
  }
}
