import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendReportEmail } from "@/lib/caseworker/email-sender";

export const maxDuration = 300; // 최대 5분 — 기관 수 증가 대비

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * POST /api/cron/weekly-reports
 *
 * Vercel Cron(또는 GitHub Actions)이 매주 일요일 23:00 UTC(월 08:00 KST)에 호출.
 * enabled=true 기관의 스케줄을 조회하고, 각 기관의 최신 done 보고서를 이메일 발송.
 * Authorization: Bearer <CRON_SECRET> 헤더 필수.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";

  if (!cronSecret) return json({ ok: false, error: "cron_not_configured" }, 503);
  if (authHeader !== `Bearer ${cronSecret}`) return json({ ok: false, error: "unauthorized" }, 401);

  const supabase = await createSupabaseServerClient();

  // enabled 스케줄 + 수신자가 있는 기관만 처리
  const { data: schedules, error: schedErr } = await supabase
    .from("report_schedules")
    .select("org_id, recipient_emails, organizations(name)")
    .eq("enabled", true)
    .filter("recipient_emails", "neq", "{}");

  if (schedErr) {
    console.error("[cron/weekly-reports] 스케줄 조회 실패:", schedErr.message);
    return json({ ok: false, error: schedErr.message }, 500);
  }

  const results: { org_id: string; status: string; error?: string }[] = [];

  for (const sched of schedules ?? []) {
    const orgId = sched.org_id;
    const orgName =
      Array.isArray(sched.organizations)
        ? (sched.organizations[0] as { name: string } | undefined)?.name ?? orgId
        : (sched.organizations as { name: string } | null)?.name ?? orgId;
    const emails: string[] = sched.recipient_emails as string[];

    try {
      // 기관의 최신 done 보고서 목록 조회
      const { data: reports, error: rErr } = await supabase
        .from("reports")
        .select("id, parent_id, period_start, period_end, paste_text, risk_level, parent_profiles(display_name)")
        .eq("org_id", orgId)
        .eq("status", "done")
        .not("paste_text", "is", null)
        .order("period_end", { ascending: false })
        .limit(100);

      if (rErr) throw new Error(rErr.message);
      if (!reports || reports.length === 0) {
        results.push({ org_id: orgId, status: "skipped_no_reports" });
        continue;
      }

      // 어르신별 최신 1건 dedup
      const seen = new Set<string>();
      const latest = reports.filter((r) => {
        if (seen.has(r.parent_id)) return false;
        seen.add(r.parent_id);
        return true;
      });

      const period = `${latest[0].period_start} ~ ${latest[0].period_end}`;

      await sendReportEmail({ orgId, orgName, period, reports: latest, recipientEmails: emails });

      // 발송 이력 기록
      await supabase.from("report_send_logs").insert(
        emails.map((email) => ({
          org_id: orgId,
          period_start: latest[0].period_start,
          period_end: latest[0].period_end,
          recipient_email: email,
          elder_count: latest.length,
          status: "sent",
        }))
      );

      results.push({ org_id: orgId, status: "sent" });
      console.log(`[cron/weekly-reports] ${orgName} → ${emails.join(", ")} 발송 완료`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      console.error(`[cron/weekly-reports] ${orgName} 발송 실패:`, msg);

      // 실패 이력 기록 (재시도 대상)
      await supabase.from("report_send_logs").insert(
        (sched.recipient_emails as string[]).map((email: string) => ({
          org_id: orgId,
          period_start: null,
          period_end: null,
          recipient_email: email,
          elder_count: 0,
          status: "failed",
          error_message: msg,
        }))
      );

      results.push({ org_id: orgId, status: "failed", error: msg });
    }
  }

  const sent  = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`[cron/weekly-reports] 완료: 성공 ${sent}건, 실패 ${failed}건`);

  return json({ ok: true, sent, failed, results });
}
