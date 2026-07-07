import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acknowledgeSafetyAlert } from "@/lib/supabase/safety-alerts-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    const alert = await acknowledgeSafetyAlert(supabase, alertId);
    return jsonResponse({ ok: true, alert });
  } catch {
    return jsonResponse({ ok: false, error: "acknowledge_failed" }, 500);
  }
}
