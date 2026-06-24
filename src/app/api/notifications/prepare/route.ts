import { loadCareTaskFixtures } from "@/lib/silverlink/notifications/fixture";
import { prepareNotifications } from "@/lib/silverlink/notifications/notification-engine";

// NextResponse.json()의 기본 Content-Type에는 charset이 없어, 일부 HTTP 클라이언트(예: Windows PowerShell
// Invoke-RestMethod)가 UTF-8이 아닌 인코딩으로 잘못 디코딩해 한글이 깨진다. charset=utf-8을 명시해 방지한다.
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  const tasks = loadCareTaskFixtures();
  const candidates = prepareNotifications(tasks, new Date());

  return jsonResponse({
    ok: true,
    dryRun: true,
    count: candidates.length,
    candidates,
  });
}
