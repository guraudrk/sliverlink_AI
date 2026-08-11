import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/org/send-logs?orgId=...&limit=20
 * 기관의 발송 이력을 최신순으로 반환.
 * "지난주 것 다시 주세요" 재전송 시 period 파악용.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url    = new URL(request.url);
  const orgId  = url.searchParams.get("orgId");
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("report_send_logs")
    .select("id, period_start, period_end, recipient_email, elder_count, status, error_message, sent_at")
    .eq("org_id", orgId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
