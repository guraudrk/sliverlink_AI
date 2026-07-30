import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/org/join
 * body: { token }
 *
 * 로그인한 사용자가 초대 토큰으로 기관에 편입된다.
 * - 토큰 유효성 검사 (미사용, 만료 전)
 * - org_members upsert (이미 멤버면 role 업데이트)
 * - 토큰 used_at 기록
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const body = await request.json().catch(() => ({})) as { token?: string };
  const { token } = body;
  if (!token) return new NextResponse("token required", { status: 400 });

  // 토큰 조회
  const { data: invite, error: invErr } = await supabase
    .from("org_invites")
    .select("id, org_id, role, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (invErr) return new NextResponse(invErr.message, { status: 500 });
  if (!invite) return new NextResponse("invalid_token", { status: 404 });
  if (invite.used_at) return new NextResponse("token_already_used", { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return new NextResponse("token_expired", { status: 410 });

  // org_members 편입 (이미 있으면 role만 업데이트)
  const { error: memberErr } = await supabase
    .from("org_members")
    .upsert(
      { org_id: invite.org_id, user_id: user.id, role: invite.role },
      { onConflict: "org_id,user_id" }
    );

  if (memberErr) return new NextResponse(memberErr.message, { status: 500 });

  // 토큰 소비
  await supabase
    .from("org_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, orgId: invite.org_id, role: invite.role });
}
