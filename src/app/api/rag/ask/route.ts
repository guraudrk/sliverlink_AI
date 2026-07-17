import { ZodError } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ragQueryRequestSchema } from "@/lib/silverlink/rag/schema";
import { resolveRagEvidence } from "@/lib/silverlink/rag/evidence-service";
import { generateAssistantAnswer } from "@/lib/silverlink/rag/assistant-response";
import { buildFallbackAnswer } from "@/lib/silverlink/rag/answer-generator";
import { selectActionCandidates, selectParentCandidates } from "@/lib/silverlink/rag/action-tools";
import { listCareTasks } from "@/lib/supabase/care-tasks-repo";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  // 모바일 앱에서 Bearer 토큰으로 인증하는 경우 지원
  const authHeader = request.headers.get("Authorization");
  let supabase;
  if (authHeader?.startsWith("Bearer ")) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
  } else {
    supabase = await createSupabaseServerClient();
  }

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
    input = ragQueryRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  try {
    const result = await resolveRagEvidence(supabase, input);
    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error }, 404);
    }

    if (!process.env.GEMINI_API_KEY) {
      const answer = buildFallbackAnswer(result.category, result.evidence);
      return jsonResponse({ ok: true, category: result.category, answer });
    }

    // 질문 답변과 명령(전화/메시지/새 일정 등록) 판단을 같은 Gemini 호출 안에서 함께 한다. 명령이면
    // 곧바로 실행하지 않고 pendingAction으로 돌려준다 — 실제 실행은 사용자가 확인을 눌러야 한다.
    const [tasks, parentProfiles] = await Promise.all([listCareTasks(supabase), listParentProfiles(supabase)]);
    const candidateTasks = selectActionCandidates(tasks, input.parentId);
    const parentCandidates = selectParentCandidates(parentProfiles, input.parentId);
    const { category, answer, pendingAction } = await generateAssistantAnswer(
      result.category,
      result.evidence,
      candidateTasks,
      parentCandidates,
      input.parentId,
      input.query,
      input.history
    );
    return jsonResponse({ ok: true, category, answer, pendingAction });
  } catch {
    return jsonResponse({ ok: false, error: "ask_failed" }, 500);
  }
}
