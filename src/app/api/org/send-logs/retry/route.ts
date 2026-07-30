import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendReportEmail } from "@/lib/caseworker/email-sender";

/**
 * POST /api/org/send-logs/retry
 * body: { logId: string }
 *
 * 실패한 발송 이력 1건을 재전송한다. 관리자 전용.
 * "지난주 것 다시 주세요" 시나리오에도 사용.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const body  = await request.json().catch(() => ({})) as { logId?: string };
  const logId = body.logId;
  if (!logId) return new NextResponse("logId required", { status: 400 });

  // 이력 조회
  const { data: log, error: logErr } = await supabase
    .from("report_send_logs")
    .select("id, org_id, period_start, period_end, recipient_email")
    .eq("id", logId)
    .maybeSingle();

  if (logErr) return new NextResponse(logErr.message, { status: 500 });
  if (!log)   return new NextResponse("not_found", { status: 404 });

  // admin 권한 확인
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", log.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (member?.role !== "admin") return new NextResponse("forbidden", { status: 403 });

  // 기관 이름 조회
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", log.org_id)
    .maybeSingle();

  const orgName = org?.name ?? log.org_id;
  const period  = `${log.period_start ?? ""} ~ ${log.period_end ?? ""}`;

  // 해당 기간 보고서 조회
  let query = supabase
    .from("reports")
    .select("parent_id, period_start, period_end, paste_text, risk_level, parent_profiles(display_name)")
    .eq("org_id", log.org_id)
    .eq("status", "done")
    .not("paste_text", "is", null);

  if (log.period_start && log.period_end) {
    query = query.eq("period_start", log.period_start).eq("period_end", log.period_end);
  }

  const { data: reports, error: rErr } = await query.order("period_end", { ascending: false }).limit(100);
  if (rErr) return new NextResponse(rErr.message, { status: 500 });
  if (!reports?.length) return new NextResponse("no_reports_for_period", { status: 404 });

  const seen = new Set<string>();
  const latest = reports.filter((r) => {
    if (seen.has(r.parent_id)) return false;
    seen.add(r.parent_id);
    return true;
  });

  try {
    await sendReportEmail({
      orgId: log.org_id,
      orgName,
      period,
      reports: latest,
      recipientEmails: [log.recipient_email],
    });

    // 재시도 성공 이력 기록
    await supabase.from("report_send_logs").insert({
      org_id: log.org_id,
      period_start: log.period_start,
      period_end:   log.period_end,
      recipient_email: log.recipient_email,
      elder_count: latest.length,
      status: "retried",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return new NextResponse(msg, { status: 500 });
  }
}
