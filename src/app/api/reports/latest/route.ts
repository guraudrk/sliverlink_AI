import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** GET /api/reports/latest?parentId=... — 최신 done 보고서의 paste_text 반환 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parentId = new URL(request.url).searchParams.get("parentId");
  if (!parentId) return NextResponse.json({ error: "parentId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("reports")
    .select("paste_text, period_start, period_end")
    .eq("parent_id", parentId)
    .eq("status", "done")
    .not("paste_text", "is", null)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ pasteText: null, period: null });

  return NextResponse.json({
    pasteText: data.paste_text,
    period: `${data.period_start} ~ ${data.period_end}`,
  });
}
