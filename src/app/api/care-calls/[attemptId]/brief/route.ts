import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnCareCallAttempt } from "@/lib/supabase/care-call-attempts-repo";
import { getCallFamilyBrief, markBriefAsRead } from "@/lib/supabase/call-family-briefs-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  // 소유권 확인 — RLS가 차단해주지만 명시적으로 검증
  const attempt = await getOwnCareCallAttempt(supabase, attemptId);
  if (!attempt) {
    return jsonResponse({ ok: false, error: "attempt_not_found" }, 404);
  }

  try {
    const brief = await getCallFamilyBrief(supabase, attemptId);
    if (!brief) {
      return jsonResponse({ ok: true, brief: null });
    }

    // 처음 조회 시 자동으로 읽음 처리
    if (!brief.read_at) {
      await markBriefAsRead(supabase, attemptId);
    }

    return jsonResponse({ ok: true, brief });
  } catch {
    return jsonResponse({ ok: false, error: "fetch_failed" }, 500);
  }
}
