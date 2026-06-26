import { ZodError } from "zod";
import { ragQueryRequestSchema } from "@/lib/silverlink/rag/schema";
import { resolveRagEvidence } from "@/lib/silverlink/rag/evidence-service";
import { generateAssistantAnswer } from "@/lib/silverlink/rag/assistant-response";
import { buildFallbackAnswer } from "@/lib/silverlink/rag/answer-generator";
import { selectActionCandidates } from "@/lib/silverlink/rag/action-tools";
import { listCareTasks } from "@/lib/supabase/care-tasks-repo";
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
    input = ragQueryRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  try {
    // 질문 분류보다 먼저 "이건 명령인가"를 본다 — 명령으로 처리됐으면 평소 질문-답변 경로는 건너뛴다.
    const actionResult = await tryHandleActionRequest(supabase, userData.user.id, input);
    if (actionResult.handled) {
      return jsonResponse({ ok: true, category: "action", answer: actionResult.answer });
    }

    const result = await resolveRagEvidence(supabase, input);
    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error }, 404);
    }
    const answer = process.env.GEMINI_API_KEY
      ? await buildLlmAnswer(result.category, result.evidence, input.query, input.history)
      : buildFallbackAnswer(result.category, result.evidence);
    return jsonResponse({ ok: true, category: result.category, answer });
  } catch {
    return jsonResponse({ ok: false, error: "ask_failed" }, 500);
  }
}
