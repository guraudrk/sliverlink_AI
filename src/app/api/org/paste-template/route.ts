import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEFAULT_PASTE_TEMPLATE = `[{{period}}] {{name}} 어르신
· 통화 {{total_calls}}회 중 {{answered_calls}}회 응답 (응답률 {{response_rate}})
· 특이사항: {{attention}}
· 상태: {{score_state}}
· 권장: {{recommendation}}`;

/** GET /api/org/paste-template?orgId=... — 기관 붙여넣기 템플릿 조회 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  // 멤버십 확인 (RLS가 하지만 명시적으로도 체크)
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data } = await supabase
    .from("paste_templates")
    .select("template, updated_at")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json({
    template: data?.template ?? DEFAULT_PASTE_TEMPLATE,
    updatedAt: data?.updated_at ?? null,
    isDefault: !data,
    isAdmin: member.role === "admin",
  });
}

/** PUT /api/org/paste-template — 기관 붙여넣기 템플릿 저장 (admin 전용) */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { orgId?: string; template?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { orgId, template } = body;
  if (!orgId || !template) {
    return NextResponse.json({ error: "orgId, template required" }, { status: 400 });
  }
  if (template.length > 2000) {
    return NextResponse.json({ error: "template too long (max 2000 chars)" }, { status: 400 });
  }

  // admin 확인
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member || member.role !== "admin") {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const { error } = await supabase
    .from("paste_templates")
    .upsert({ org_id: orgId, template }, { onConflict: "org_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
