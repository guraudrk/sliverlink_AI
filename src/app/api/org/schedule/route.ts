import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEFAULT_CRON_EXPR = "0 23 * * 0"; // 일 23:00 UTC = 월 08:00 KST

/**
 * GET /api/org/schedule?orgId=...
 * 기관 발송 스케줄 조회. 없으면 기본값 반환.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return new NextResponse("orgId required", { status: 400 });

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return new NextResponse("forbidden", { status: 403 });

  const { data } = await supabase
    .from("report_schedules")
    .select("cron_expr, enabled, recipient_emails")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json(
    data ?? { cron_expr: DEFAULT_CRON_EXPR, enabled: false, recipient_emails: [] }
  );
}

/**
 * PUT /api/org/schedule
 * body: { orgId, enabled, recipient_emails }
 * 관리자만. cron_expr은 현재 고정(UI 제공 안 함) — 기관 미팅 후 필요 시 노출.
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    orgId?: string;
    enabled?: boolean;
    recipient_emails?: string[];
  };

  const { orgId, enabled, recipient_emails } = body;
  if (!orgId) return new NextResponse("orgId required", { status: 400 });

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (member?.role !== "admin") return new NextResponse("forbidden", { status: 403 });

  // 이메일 형식 간단 검증
  const emails = (recipient_emails ?? []).filter((e) => e.includes("@")).slice(0, 10);

  const { error } = await supabase
    .from("report_schedules")
    .upsert(
      {
        org_id:           orgId,
        enabled:          enabled ?? false,
        recipient_emails: emails,
        cron_expr:        DEFAULT_CRON_EXPR,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
