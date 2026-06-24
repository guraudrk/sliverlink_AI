import { ZodError } from "zod";
import { sendToMakeWebhook } from "@/lib/silverlink/make-client";
import { buildSilverLinkPayload } from "@/lib/silverlink/payload";

// NextResponse.json()의 기본 Content-Type에는 charset이 없어, 일부 HTTP 클라이언트(예: Windows PowerShell
// Invoke-RestMethod)가 UTF-8이 아닌 인코딩으로 잘못 디코딩해 한글이 깨진다. charset=utf-8을 명시해 방지한다.
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  let payload;
  try {
    payload = buildSilverLinkPayload(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  const result = await sendToMakeWebhook(payload);

  if (result.ok) {
    return jsonResponse(
      result.dryRun ? { ok: true, dryRun: true, payload: result.payload } : { ok: true, dryRun: false }
    );
  }

  if (result.error === "missing_webhook_url") {
    return jsonResponse({ ok: false, error: "missing_webhook_url" }, 500);
  }

  return jsonResponse({ ok: false, error: "webhook_request_failed" }, 502);
}
