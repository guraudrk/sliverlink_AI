import { checkDueTasks } from "@/lib/silverlink/cron/check-due-tasks";

export const maxDuration = 60;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Vercel Cron이 매일 UTC 00:00(한국 09:00)에 이 엔드포인트를 POST로 호출한다.
// 외부에서 임의 트리거를 막기 위해 Authorization: Bearer <CRON_SECRET> 헤더를 검증한다.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";

  if (!cronSecret) {
    return jsonResponse({ ok: false, error: "cron_not_configured" }, 503);
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    const result = await checkDueTasks();
    console.log("[cron/check-due-tasks] 완료:", result);
    return jsonResponse({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error("[cron/check-due-tasks] 오류:", message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
}
