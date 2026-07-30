import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/org/privacy-settings?orgId=...
 * 기관의 개인정보 처리 설정 조회.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return new NextResponse("orgId required", { status: 400 });

  const { data: member } = await supabase
    .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (!member) return new NextResponse("forbidden", { status: 403 });

  const { data } = await supabase
    .from("organizations")
    .select("recording_retention_days")
    .eq("id", orgId)
    .maybeSingle();

  return NextResponse.json({ recording_retention_days: data?.recording_retention_days ?? null });
}

/**
 * PUT /api/org/privacy-settings
 * body: { orgId, recording_retention_days: null | 30 | 90 | 180 }
 * null = 즉시 파기(기본), 숫자 = 보관 일수 (관리자 전용)
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    orgId?: string;
    recording_retention_days?: number | null;
  };
  const { orgId, recording_retention_days } = body;
  if (!orgId) return new NextResponse("orgId required", { status: 400 });

  const { data: member } = await supabase
    .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (member?.role !== "admin") return new NextResponse("forbidden", { status: 403 });

  const days = recording_retention_days == null ? null : Number(recording_retention_days);
  if (days !== null && (days < 0 || days > 365)) {
    return new NextResponse("retention_days must be null or 0~365", { status: 400 });
  }

  const { error } = await supabase
    .from("organizations")
    .update({ recording_retention_days: days })
    .eq("id", orgId);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
