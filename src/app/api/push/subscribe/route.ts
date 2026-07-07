import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertPushSubscription, deletePushSubscription } from "@/lib/supabase/push-subscriptions-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 구독 등록
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

  const { endpoint, p256dh, auth } = body as Record<string, unknown>;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return jsonResponse({ ok: false, error: "missing_fields" }, 400);
  }

  try {
    await upsertPushSubscription(supabase, {
      owner_user_id: userData.user.id,
      endpoint,
      p256dh,
      auth,
    });
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ ok: false, error: "save_failed" }, 500);
  }
}

// 구독 해제
export async function DELETE(request: Request) {
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

  const { endpoint } = body as Record<string, unknown>;
  if (typeof endpoint !== "string") {
    return jsonResponse({ ok: false, error: "missing_endpoint" }, 400);
  }

  try {
    await deletePushSubscription(supabase, endpoint);
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ ok: false, error: "delete_failed" }, 500);
  }
}
