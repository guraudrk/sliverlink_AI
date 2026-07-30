import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchBatchElderData,
  computeRiskLevel,
  generateBatchReportText,
} from "@/lib/caseworker/batch-report-service";

const CHUNK_SIZE = 5;

type BatchBody = {
  orgId?: string;
  periodStart?: string;
  periodEnd?: string;
  elderIds?: string[];
  reportSetId?: string;
  retryErrors?: boolean;   // true이면 error 행을 pending으로 리셋 후 재시도
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: BatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { orgId, periodStart, periodEnd, elderIds, reportSetId, retryErrors } = body;

  // ── 재개 / 에러 재시도: reportSetId 제공됨 ──
  if (reportSetId) {
    const { data: sample } = await supabase
      .from("reports")
      .select("org_id, period_start, period_end")
      .eq("report_set_id", reportSetId)
      .limit(1)
      .maybeSingle();

    if (!sample) {
      return NextResponse.json({ error: "report_set_not_found" }, { status: 404 });
    }

    // retryErrors: error 행을 pending으로 리셋해서 다음 processChunk에서 재처리
    if (retryErrors) {
      await supabase
        .from("reports")
        .update({ status: "pending", error_msg: null })
        .eq("report_set_id", reportSetId)
        .eq("status", "error");
    }

    const progress = await processChunk(
      supabase, reportSetId,
      sample.period_start as string, sample.period_end as string,
    );
    return NextResponse.json({ reportSetId, ...progress });
  }

  // ── 신규 배치 ──
  if (!orgId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "orgId, periodStart, periodEnd required" },
      { status: 400 },
    );
  }

  // 기관 소속 확인
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 어르신 목록 결정
  let parentIds: string[];
  if (elderIds && elderIds.length > 0) {
    parentIds = elderIds;
  } else {
    const { data: parents, error: pErr } = await supabase
      .from("parent_profiles")
      .select("id")
      .eq("org_id", orgId);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    parentIds = (parents ?? []).map((p: { id: string }) => p.id);
  }

  if (parentIds.length === 0) {
    return NextResponse.json({ error: "no_elders_in_org" }, { status: 400 });
  }

  // 모든 어르신 pending 행 삽입
  const newSetId = crypto.randomUUID();
  const { error: insertErr } = await supabase.from("reports").insert(
    parentIds.map((pid) => ({
      org_id: orgId,
      parent_id: pid,
      report_set_id: newSetId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "pending",
    })),
  );
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // 첫 청크 처리
  const progress = await processChunk(supabase, newSetId, periodStart, periodEnd);
  return NextResponse.json({ reportSetId: newSetId, ...progress });
}

async function processChunk(
  supabase: SupabaseClient,
  reportSetId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ total: number; done: number; errors: number; remaining: number }> {
  // pending 행 청크 취득
  const { data: pendingRows } = await supabase
    .from("reports")
    .select("id, parent_id")
    .eq("report_set_id", reportSetId)
    .eq("status", "pending")
    .limit(CHUNK_SIZE);

  const rows = pendingRows ?? [];

  for (const row of rows) {
    // generating 마킹
    await supabase.from("reports").update({ status: "generating" }).eq("id", row.id);

    try {
      const elderData = await fetchBatchElderData(
        supabase, row.parent_id as string, periodStart, periodEnd,
      );

      if (!elderData) {
        await supabase
          .from("reports")
          .update({ status: "error", error_msg: "elder_not_found" })
          .eq("id", row.id);
        continue;
      }

      const { text, factIssues } = await generateBatchReportText(elderData);
      const riskLevel = computeRiskLevel(elderData.alerts);

      await supabase.from("reports").update({
        summary_md:   text,
        paste_text:   text,   // Day 38에서 포맷 분리
        risk_level:   riskLevel,
        status:       "done",
        generated_at: new Date().toISOString(),
        model:        process.env.GEMINI_LLM_MODEL ?? "gemini-2.5-flash",
        error_msg:    factIssues.length > 0 ? `검증 경고: ${factIssues.join("; ")}` : null,
      }).eq("id", row.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_error";
      await supabase
        .from("reports")
        .update({ status: "error", error_msg: msg })
        .eq("id", row.id);
    }
  }

  // 최종 카운트 (단일 쿼리로 status 별 집계)
  const { data: counts } = await supabase
    .from("reports")
    .select("status")
    .eq("report_set_id", reportSetId);

  const all = counts ?? [];
  const total     = all.length;
  const done      = all.filter((r: { status: string }) => r.status === "done").length;
  const errors    = all.filter((r: { status: string }) => r.status === "error").length;
  const remaining = all.filter((r: { status: string }) => r.status === "pending" || r.status === "generating").length;

  return { total, done, errors, remaining };
}
