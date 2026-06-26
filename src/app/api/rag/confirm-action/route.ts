import { ZodError } from "zod";
import { ragConfirmActionRequestSchema } from "@/lib/silverlink/rag/schema";
import { confirmActionIntent } from "@/lib/silverlink/rag/action-service";
import { selectActionCandidates } from "@/lib/silverlink/rag/action-tools";
import { isOwnParentProfile, listCareTasks } from "@/lib/supabase/care-tasks-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 채팅 UI에서 명령 확인 버튼을 눌렀을 때만 호출된다 — /api/rag/ask는 명령을 감지해도 여기로 실행을
// 미루고 pendingAction만 돌려준다(실행 전 확인 UX, 2026-06-26 사용자 요청).
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
    input = ragConfirmActionRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  if (input.parentId) {
    const owns = await isOwnParentProfile(supabase, input.parentId);
    if (!owns) {
      return jsonResponse({ ok: false, error: "parent_not_found" }, 404);
    }
  }

  try {
    // 확인 버튼을 누르기까지 시간이 지날 수 있어, ask 때 봤던 후보 목록을 그대로 믿지 않고
    // 다시 조회해서 그 사이 완료/변경된 일정이면 confirmActionIntent가 거부하게 한다.
    const tasks = await listCareTasks(supabase);
    const candidateTasks = selectActionCandidates(tasks, input.parentId);
    const answer = await confirmActionIntent(supabase, userData.user.id, input.intent, candidateTasks);
    return jsonResponse({ ok: true, category: "action", answer });
  } catch {
    return jsonResponse({ ok: false, error: "confirm_action_failed" }, 500);
  }
}
