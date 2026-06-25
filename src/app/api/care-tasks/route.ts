import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCareTasks } from "@/lib/supabase/care-tasks-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    const careTasks = await listCareTasks(supabase);
    return jsonResponse({ ok: true, careTasks });
  } catch {
    return jsonResponse({ ok: false, error: "list_failed" }, 500);
  }
}
