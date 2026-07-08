import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGeminiClient, getLlmModel } from "@/lib/silverlink/rag/gemini-client";
import { buildCarePlanPrompt, CARE_PLAN_SYSTEM_PROMPT } from "@/lib/caseworker/care-plan-prompt";

function errResponse(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return errResponse("unauthorized", 401);

  let parentId: string;
  try {
    const body = await request.json();
    if (typeof body.parentId !== "string" || !body.parentId) {
      return errResponse("parentId_required");
    }
    parentId = body.parentId;
  } catch {
    return errResponse("invalid_json");
  }

  const prompt = await buildCarePlanPrompt(supabase, parentId, userData.user.id);
  if (!prompt) return errResponse("elder_not_found", 404);

  try {
    const streamResult = await getGeminiClient().models.generateContentStream({
      model: getLlmModel(),
      contents: prompt,
      config: {
        systemInstruction: CARE_PLAN_SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2048,
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return errResponse("generation_failed", 500);
  }
}
