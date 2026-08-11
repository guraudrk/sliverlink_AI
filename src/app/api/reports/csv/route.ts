import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/reports/csv?orgId=...&reportSetId=...
 * 기관의 가장 최신 done 보고서(또는 특정 reportSetId)를 CSV로 반환.
 * UTF-8 BOM 포함 — 엑셀 한글 깨짐 없음.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url        = new URL(request.url);
  const orgId      = url.searchParams.get("orgId");
  const reportSetId = url.searchParams.get("reportSetId");

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  // 기관 멤버 확인
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 보고서 조회
  let query = supabase
    .from("reports")
    .select("parent_id, period_start, period_end, paste_text, risk_level, status, parent_profiles(display_name)")
    .eq("org_id", orgId)
    .eq("status", "done");

  if (reportSetId) {
    query = query.eq("report_set_id", reportSetId);
  } else {
    // reportSetId 미지정 → 어르신별 가장 최신 보고서 1건씩
    // Supabase에서 DISTINCT ON을 직접 지원하지 않으므로
    // period_end DESC 정렬 후 클라이언트에서 dedup
  }

  const { data: rows, error } = await query.order("period_end", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allRows = (rows ?? []).map((r) => ({
    ...r,
    parent_profiles: Array.isArray(r.parent_profiles)
      ? (r.parent_profiles[0] as { display_name: string } | null) ?? null
      : (r.parent_profiles as { display_name: string } | null),
  })) as ReportRow[];

  // reportSetId 없으면 어르신별 최신 1건만
  const deduped = reportSetId
    ? allRows
    : dedupByParent(allRows);

  if (deduped.length === 0) {
    return NextResponse.json({ error: "no_reports" }, { status: 404 });
  }

  // CSV 생성
  const csv = buildCsv(deduped);

  // UTF-8 BOM 추가 (엑셀 한글 깨짐 방지)
  const BOM = "﻿";
  const period = deduped[0]
    ? `${deduped[0].period_start}_${deduped[0].period_end}`
    : "report";
  const filename = `silverlink_${period}.csv`;

  // 접근 로그 — CSV 다운로드
  void supabase.from("access_logs").insert({
    org_id: orgId, user_id: user.id, parent_id: null, action: "csv_download",
  });

  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

type ReportRow = {
  parent_id: string;
  period_start: string;
  period_end: string;
  paste_text: string | null;
  risk_level: string;
  status: string;
  parent_profiles: { display_name: string } | null;
};

function dedupByParent(rows: ReportRow[]): ReportRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.parent_id)) return false;
    seen.add(r.parent_id);
    return true;
  });
}

function csvCell(v: string | null | undefined): string {
  const s = v ?? "";
  // 쉼표·줄바꿈·큰따옴표가 있으면 큰따옴표로 감싸고 내부 큰따옴표는 ""로 이스케이프
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: ReportRow[]): string {
  const headers = ["이름", "기간", "위험도", "기록 내용"];
  const lines = [headers.map(csvCell).join(",")];

  for (const r of rows) {
    const name   = r.parent_profiles?.display_name ?? "";
    const period = `${r.period_start} ~ ${r.period_end}`;
    const risk   = r.risk_level === "critical" ? "위험" : r.risk_level === "warning" ? "주의" : "정상";
    lines.push([name, period, risk, r.paste_text ?? ""].map(csvCell).join(","));
  }

  return lines.join("\r\n");
}
