import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listSocialScores, getWeekStart } from "@/lib/supabase/social-scores-repo";

export type TimelineEventType = "call" | "alert" | "brief" | "recording";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  date: string; // ISO
  meta?: Record<string, string | number | null>;
};

export type WeeklyTrend = {
  week_start: string;
  call_count: number;
  alert_count: number;
  social_score: number | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const STATUS_LABEL: Record<string, string> = {
  completed: "완료",
  help_requested: "도움 요청",
  no_answer: "무응답",
  prepared: "준비됨",
  in_progress: "진행 중",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ ok: false, error: "unauthorized" }, 401);

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  if (!parentId) return json({ ok: false, error: "parentId_required" }, 400);

  // 병렬로 4개 테이블 조회
  const [{ data: calls }, { data: alerts }, { data: briefs }, { data: recordings }, scores] = await Promise.all([
    supabase
      .from("care_call_attempts")
      .select("id, status, parent_response, summary, created_at")
      .eq("owner_user_id", userData.user.id)
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("safety_alerts")
      .select("id, category, severity, title, description, acknowledged_at, generated_at")
      .eq("owner_user_id", userData.user.id)
      .eq("elder_id", parentId)
      .order("generated_at", { ascending: false })
      .limit(100),
    supabase
      .from("call_family_briefs")
      .select("id, attention_item, generated_at, read_at")
      .eq("owner_user_id", userData.user.id)
      .eq("elder_id", parentId)
      .order("generated_at", { ascending: false })
      .limit(100),
    supabase
      .from("call_recordings")
      .select("id, ai_summary, risk_level, recorded_at")
      .eq("owner_user_id", userData.user.id)
      .eq("parent_id", parentId)
      .eq("status", "analyzed")
      .order("recorded_at", { ascending: false })
      .limit(100),
    listSocialScores(supabase, parentId, 12),
  ]);

  // 통합 이벤트 목록 생성
  const events: TimelineEvent[] = [];

  for (const c of calls ?? []) {
    events.push({
      id: c.id,
      type: "call",
      title: `안부전화 — ${STATUS_LABEL[c.status] ?? c.status}`,
      description: c.summary ?? c.parent_response ?? "기록 없음",
      date: c.created_at,
      meta: { status: c.status },
    });
  }

  for (const a of alerts ?? []) {
    events.push({
      id: a.id,
      type: "alert",
      title: `안전 알림 (${SEVERITY_LABEL[a.severity] ?? a.severity}) — ${a.title}`,
      description: a.description,
      date: a.generated_at,
      meta: {
        severity: a.severity,
        acknowledged: a.acknowledged_at ? "확인됨" : "미확인",
      },
    });
  }

  for (const b of briefs ?? []) {
    events.push({
      id: b.id,
      type: "brief",
      title: "가족 브리핑 생성됨",
      description: b.attention_item ?? "이번 통화 기반 브리핑이에요.",
      date: b.generated_at,
      meta: { read: b.read_at ? "읽음" : "미읽음" },
    });
  }

  const RISK_LABEL: Record<string, string> = { none: "이상 없음", low: "가벼운 주의", medium: "관심 필요", high: "즉각 확인" };

  for (const r of recordings ?? []) {
    let summary = "AI 분석 완료";
    try {
      const parsed = JSON.parse(r.ai_summary ?? "{}");
      if (parsed.summary) summary = parsed.summary;
    } catch { /* ignore */ }
    events.push({
      id: r.id,
      type: "recording",
      title: `통화 녹음 분석 — ${RISK_LABEL[r.risk_level ?? "none"] ?? "분석 완료"}`,
      description: summary,
      date: r.recorded_at,
      meta: { risk_level: r.risk_level ?? "none" },
    });
  }

  // 날짜 내림차순 정렬
  events.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 주별 트렌드 집계
  const trendMap = new Map<string, WeeklyTrend>();

  for (const c of calls ?? []) {
    const ws = getWeekStart(new Date(c.created_at));
    if (!trendMap.has(ws)) {
      trendMap.set(ws, { week_start: ws, call_count: 0, alert_count: 0, social_score: null });
    }
    trendMap.get(ws)!.call_count += 1;
  }

  for (const a of alerts ?? []) {
    const ws = getWeekStart(new Date(a.generated_at));
    if (!trendMap.has(ws)) {
      trendMap.set(ws, { week_start: ws, call_count: 0, alert_count: 0, social_score: null });
    }
    trendMap.get(ws)!.alert_count += 1;
  }

  for (const s of scores) {
    if (!trendMap.has(s.week_start)) {
      trendMap.set(s.week_start, { week_start: s.week_start, call_count: 0, alert_count: 0, social_score: null });
    }
    trendMap.get(s.week_start)!.social_score = s.score;
  }

  const trends = [...trendMap.values()].sort((a, b) =>
    a.week_start < b.week_start ? -1 : 1
  );

  // KPI 집계
  const totalCalls = (calls ?? []).length;
  const answeredCalls = (calls ?? []).filter(
    (c) => c.status === "completed" && c.parent_response !== "no_answer"
  ).length;
  const totalAlerts = (alerts ?? []).length;
  const currentScore = scores[0]?.score ?? null;

  return json({
    ok: true,
    events,
    trends,
    kpi: {
      total_calls: totalCalls,
      answer_rate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : null,
      total_alerts: totalAlerts,
      current_score: currentScore,
    },
  });
}
