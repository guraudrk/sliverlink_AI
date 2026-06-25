import { ZodError } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parentProfileInputSchema, updateParentProfile } from "@/lib/supabase/parent-profiles-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    input = parentProfileInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  try {
    const profile = await updateParentProfile(supabase, id, input);
    return jsonResponse({ ok: true, profile });
  } catch {
    // RLS가 남의 행은 0건 갱신으로 막아주므로, .single()이 행을 못 찾는 경우도 여기로 들어온다 —
    // "존재하지 않음"과 "내 소유가 아님"을 구분해서 알려주지 않는다(정보 노출 최소화).
    return jsonResponse({ ok: false, error: "update_failed" }, 404);
  }
}
