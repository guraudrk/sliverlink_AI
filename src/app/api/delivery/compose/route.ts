import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnCareTask } from "@/lib/supabase/care-tasks-repo";
import { getParentProfileById } from "@/lib/supabase/parent-profiles-repo";
import { getGeminiClient, getLlmModel } from "@/lib/silverlink/rag/gemini-client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function buildSmsPrompt(parentName: string, relationship: string, profile: {
  care_context?: string | null;
  medication_notes?: string | null;
  daily_routine?: string | null;
  communication_style?: string | null;
  memo?: string | null;
}, taskRequest: string): string {
  const profileLines = [
    profile.care_context && `돌봄 내용: ${profile.care_context}`,
    profile.medication_notes && `복약 정보: ${profile.medication_notes}`,
    profile.daily_routine && `일상 루틴: ${profile.daily_routine}`,
    profile.communication_style && `소통 방식: ${profile.communication_style}`,
    profile.memo && `메모: ${profile.memo}`,
  ].filter(Boolean).join("\n");

  return `당신은 한국의 어르신 돌봄 서비스 AI입니다.
자녀가 부모님께 보낼 SMS 메시지를 자동으로 작성해 주세요.

부모님 정보:
- 이름/호칭: ${parentName} (${relationship})
${profileLines}

자녀의 요청 내용:
${taskRequest}

작성 규칙:
- 50자 이내의 짧고 따뜻한 문장으로 작성
- 존댓말 사용 (어르신이 받아볼 메시지)
- 부모님 이름이나 호칭을 자연스럽게 포함
- 이모지 1개 이하만 사용
- 결과물은 메시지 본문만 출력 (따옴표나 설명 없이)`;
}

function buildCallScriptPrompt(parentName: string, relationship: string, profile: {
  care_context?: string | null;
  medication_notes?: string | null;
  daily_routine?: string | null;
  communication_style?: string | null;
  memo?: string | null;
}, taskRequest: string): string {
  const profileLines = [
    profile.care_context && `돌봄 내용: ${profile.care_context}`,
    profile.medication_notes && `복약 정보: ${profile.medication_notes}`,
    profile.daily_routine && `일상 루틴: ${profile.daily_routine}`,
    profile.communication_style && `소통 방식: ${profile.communication_style}`,
    profile.memo && `메모: ${profile.memo}`,
  ].filter(Boolean).join("\n");

  return `당신은 한국의 어르신 돌봄 서비스 AI입니다.
자녀를 대신해 부모님께 전화할 때 사용할 ARS 안내 스크립트를 작성해 주세요.

부모님 정보:
- 이름/호칭: ${parentName} (${relationship})
${profileLines}

자녀의 요청 내용:
${taskRequest}

작성 규칙:
- 전화를 받은 어르신이 바로 이해할 수 있는 짧고 명확한 안내
- "1번을 누르시면 완료, 2번을 누르시면 도움 요청"으로 끝날 것
- 100자 이내
- 결과물은 스크립트 본문만 출력 (따옴표나 설명 없이)`;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let body: { care_task_id?: unknown; compose_type?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const careTaskId = typeof body.care_task_id === "string" ? body.care_task_id : null;
  const composeType = body.compose_type === "call_script" ? "call_script" : "sms";

  if (!careTaskId) {
    return jsonResponse({ ok: false, error: "care_task_id_required" }, 400);
  }

  const careTask = await getOwnCareTask(supabase, careTaskId).catch(() => null);
  if (!careTask) {
    return jsonResponse({ ok: false, error: "care_task_not_found" }, 403);
  }

  const profile = await getParentProfileById(supabase, careTask.parent_id).catch(() => null);
  if (!profile) {
    return jsonResponse({ ok: false, error: "parent_not_found" }, 404);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ ok: false, error: "gemini_not_configured" }, 503);
  }

  const prompt =
    composeType === "call_script"
      ? buildCallScriptPrompt(
          profile.display_name,
          profile.relationship ?? "부모님",
          profile,
          careTask.original_request ?? ""
        )
      : buildSmsPrompt(
          profile.display_name,
          profile.relationship ?? "부모님",
          profile,
          careTask.original_request ?? ""
        );

  try {
    const gemini = getGeminiClient();
    const model = getLlmModel();
    const result = await gemini.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text) {
      return jsonResponse({ ok: false, error: "empty_response" }, 502);
    }
    return jsonResponse({ ok: true, text, composeType });
  } catch (e) {
    return jsonResponse({
      ok: false,
      error: "gemini_failed",
      message: e instanceof Error ? e.message : "AI 호출 실패",
    }, 502);
  }
}
