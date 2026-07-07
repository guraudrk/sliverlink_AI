import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listSocialScores } from "@/lib/supabase/social-scores-repo";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ ok: false, error: "unauthorized" }, 401);

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  if (!parentId) return json({ ok: false, error: "parentId_required" }, 400);

  const weeks = Math.min(Number(searchParams.get("weeks") ?? "8"), 52);

  try {
    const scores = await listSocialScores(supabase, parentId, weeks);
    return json({ ok: true, scores });
  } catch {
    return json({ ok: false, error: "query_failed" }, 500);
  }
}
