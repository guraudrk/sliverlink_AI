import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/org/invite
 * body: { orgId, email, role }
 *
 * 기관 관리자가 멤버를 초대한다.
 * 초대 토큰(7일 유효)을 생성하고 /join?token=... 링크를 반환.
 * ENABLE_REAL_EMAIL=true이면 Resend로 초대 이메일도 발송.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    orgId?: string; email?: string; role?: string;
  };
  const { orgId, email, role = "social_worker" } = body;

  if (!orgId || !email) return NextResponse.json({ error: "orgId and email required" }, { status: 400 });
  if (!email.includes("@")) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  if (!["admin", "social_worker", "field_worker"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  // 관리자 확인
  const { data: member } = await supabase
    .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (member?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 기관 이름 조회
  const { data: org } = await supabase
    .from("organizations").select("name").eq("id", orgId).maybeSingle();
  const orgName = org?.name ?? "기관";

  // 이미 멤버인지 확인 (이메일로는 불가 — user_id 없음. 기존 초대 중복만 방지)
  const { data: existing } = await supabase
    .from("org_invites")
    .select("id")
    .eq("org_id", orgId)
    .eq("invited_email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existing) {
    // 기존 유효 초대가 있으면 재사용
    const { data: inv } = await supabase
      .from("org_invites").select("token").eq("id", existing.id).maybeSingle();
    const joinUrl = buildJoinUrl(inv?.token ?? "");
    return NextResponse.json({ ok: true, joinUrl, reused: true });
  }

  // 새 초대 생성
  const { data: invite, error } = await supabase
    .from("org_invites")
    .insert({ org_id: orgId, invited_email: email, role, created_by: user.id })
    .select("token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const joinUrl = buildJoinUrl(invite.token);

  // 이메일 발송 (ENABLE_REAL_EMAIL=true일 때만)
  if (process.env.ENABLE_REAL_EMAIL === "true" && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM ?? "SilverLink <onboarding@resend.dev>";
    await resend.emails.send({
      from,
      to: [email],
      subject: `[SilverLink] ${orgName} 멤버 초대`,
      html: buildInviteEmailHtml(orgName, joinUrl, role),
    }).catch((e: Error) => console.error("[invite] 이메일 발송 실패:", e.message));
  }

  return NextResponse.json({ ok: true, joinUrl });
}

function buildJoinUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://silverlink-ai.vercel.app";
  return `${base}/join?token=${token}`;
}

const ROLE_LABELS: Record<string, string> = {
  admin:          "센터장(관리자)",
  social_worker:  "전담사회복지사",
  field_worker:   "생활지원사",
};

function buildInviteEmailHtml(orgName: string, joinUrl: string, role: string): string {
  return `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#1e40af">SilverLink 초대</h2>
  <p>${orgName}에서 <strong>${ROLE_LABELS[role] ?? role}</strong>로 초대했습니다.</p>
  <p>아래 링크를 클릭해 가입 후 자동으로 기관에 편입됩니다. (7일 유효)</p>
  <a href="${joinUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600">
    초대 수락하기
  </a>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px">링크가 작동하지 않으면 직접 복사해서 브라우저에 붙여넣으세요:<br>${joinUrl}</p>
</div>`;
}
