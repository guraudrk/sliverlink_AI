import { getOwnCareCallAttempt, updateCareCallAttempt } from "@/lib/supabase/care-call-attempts-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 실제 전화를 걸지 않는다 — Mock이므로 "전화 연결됨" 상태로 즉시 전환만 한다.
export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
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
  if (attempt.status !== "prepared") {
    return jsonResponse({ ok: false, error: "already_started" }, 409);
  }

  try {
    const updated = await updateCareCallAttempt(supabase, attemptId, {
      status: "answered",
      started_at: new Date().toISOString(),
    });
    return jsonResponse({ ok: true, attempt: updated });
  } catch {
    return jsonResponse({ ok: false, error: "update_failed" }, 500);
  }
}
