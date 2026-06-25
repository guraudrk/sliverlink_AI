import { ZodError } from "zod";
import { respondActionInputSchema } from "@/lib/silverlink/responses/schema";
import { getNotificationByToken, respondToNotification } from "@/lib/supabase/responses-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 어르신은 로그인하지 않으므로 GET/POST 둘 다 인증을 요구하지 않는다 — 대신 토큰 자체가
// 접근 권한 역할을 한다(SECURITY DEFINER 함수가 토큰 일치 여부만으로 행을 찾아준다).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();

  let notification;
  try {
    notification = await getNotificationByToken(supabase, token);
  } catch {
    return jsonResponse({ ok: false, error: "lookup_failed" }, 500);
  }

  if (!notification) {
    return jsonResponse({ ok: false, error: "not_found" }, 404);
  }

  const isExpired = notification.expires_at !== null && new Date(notification.expires_at) < new Date();
  const isResponded = notification.status === "responded";

  return jsonResponse({ ok: true, notification, isExpired, isResponded });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  let input;
  try {
    input = respondActionInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  const supabase = await createSupabaseServerClient();

  let result;
  try {
    result = await respondToNotification(supabase, token, input.action);
  } catch {
    return jsonResponse({ ok: false, error: "respond_failed" }, 500);
  }

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 409;
    return jsonResponse({ ok: false, error: result.error }, status);
  }

  return jsonResponse({ ok: true, action: result.action, careTaskStatus: result.care_task_status });
}
