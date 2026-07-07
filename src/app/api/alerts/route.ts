import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listSafetyAlerts } from "@/lib/supabase/safety-alerts-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const unacknowledgedOnly = searchParams.get("unacknowledged") === "1";

  try {
    const alerts = await listSafetyAlerts(supabase, { unacknowledgedOnly });
    return jsonResponse({ ok: true, alerts });
  } catch {
    return jsonResponse({ ok: false, error: "fetch_failed" }, 500);
  }
}
