import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/server-user";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { ElderDetailClient } from "@/components/app/elder-detail-client";

export const metadata: Metadata = { title: "어르신 현황 — SilverLink AI" };

type PageProps = { params: Promise<{ parentId: string }> };

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null)
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-400">점수 없음</span>;
  if (score >= 70)
    return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{score}점 · 활발</span>;
  if (score >= 40)
    return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{score}점 · 보통</span>;
  return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">{score}점 · 낮음</span>;
}

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const W = 80, H = 28, pad = 3;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2);
    const y = H - pad - ((s - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastScore = scores[scores.length - 1];
  const trend = scores.length >= 2 ? lastScore - scores[scores.length - 2] : 0;
  const color = trend > 0 ? "#10b981" : trend < 0 ? "#f43f5e" : "#94a3b8";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CallDot({ status }: { status: string }) {
  const cls =
    status === "answered" ? "bg-emerald-400"
    : status === "no_answer" ? "bg-rose-400"
    : "bg-slate-300";
  const title = status === "answered" ? "응답" : status === "no_answer" ? "미응답" : status;
  return <span title={title} className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

export default async function ElderDetailPage({ params }: PageProps) {
  const { parentId } = await params;
  const user = await getServerUser();
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const [profileResult, scoresResult, callsResult, alertsResult, tasksResult, logsResult, queueResult] =
    await Promise.all([
      supabase
        .from("parent_profiles")
        .select("id, display_name, relationship")
        .eq("id", parentId)
        .eq("owner_user_id", user.id)
        .maybeSingle(),
      supabase
        .from("social_scores")
        .select("week_start, score")
        .eq("parent_id", parentId)
        .eq("owner_user_id", user.id)
        .order("week_start", { ascending: true })
        .limit(4),
      supabase
        .from("care_call_attempts")
        .select("id, status, summary, created_at")
        .eq("parent_id", parentId)
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("safety_alerts")
        .select("id, severity, title, description, suggestion, generated_at, acknowledged_at")
        .eq("elder_id", parentId)
        .eq("owner_user_id", user.id)
        .is("acknowledged_at", null)
        .order("generated_at", { ascending: false })
        .limit(3),
      supabase
        .from("care_tasks")
        .select("id, parent_id, target_person, original_request, status, priority, task_type, completed_at, notification_status, created_at")
        .eq("parent_id", parentId)
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("message_logs")
        .select("id, parent_id, care_task_id, sender, receiver, raw_message, direction, source_channel, created_at")
        .eq("parent_id", parentId)
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("notification_queue")
        .select("*")
        .eq("parent_id", parentId)
        .eq("owner_user_id", user.id)
        .gte("created_at", fourWeeksAgo),
    ]);

  if (!profileResult.data) notFound();

  const profile = profileResult.data;
  const scores = (scoresResult.data ?? []) as Array<{ week_start: string; score: number }>;
  const calls = (callsResult.data ?? []) as Array<{ id: string; status: string; summary: string | null; created_at: string }>;
  const unackedAlerts = (alertsResult.data ?? []) as Array<{ id: string; severity: string; title: string; description: string; suggestion: string | null; generated_at: string; acknowledged_at: string | null }>;
  const careTasks = (tasksResult.data ?? []) as CareTaskSummary[];
  const allLogs = (logsResult.data ?? []) as MessageLogSummary[];
  const responses = allLogs.filter((l) => l.direction === "parent_response");

  const scoreValues = scores.map((s) => s.score);
  const latestScore = scores.length > 0 ? scores[scores.length - 1].score : null;

  const queueByCareTaskId: Record<string, NotificationQueueRow[]> = {};
  for (const entry of (queueResult.data ?? []) as NotificationQueueRow[]) {
    const list = queueByCareTaskId[entry.care_task_id] ?? [];
    list.push(entry);
    queueByCareTaskId[entry.care_task_id] = list;
  }
  const messageLogByCareTaskId: Record<string, MessageLogSummary> = {};
  for (const log of allLogs) {
    if (log.care_task_id && !messageLogByCareTaskId[log.care_task_id]) {
      messageLogByCareTaskId[log.care_task_id] = log;
    }
  }


  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl space-y-6">
        {/* 헤더 */}
        <div className="animate-rag-fade-in-up text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {profile.display_name}
            {profile.relationship ? ` (${profile.relationship})` : ""}
          </h1>
        </div>

        {/* 종합 상태 카드 */}
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 animate-rag-fade-in-up"
          style={{ animationDelay: "40ms" }}
        >
          {/* 사회 연결 점수 */}
          <div className="col-span-2 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">사회 연결 점수</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <ScoreBadge score={latestScore} />
              <Sparkline scores={scoreValues} />
            </div>
            {scores.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">최근 {scores.length}주 추이</p>
            )}
          </div>

          {/* 최근 통화 */}
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">최근 통화</p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {calls.length === 0
                ? <span className="text-sm text-slate-400">없음</span>
                : calls.map((c) => <CallDot key={c.id} status={c.status} />)
              }
            </div>
            <p className="mt-1 text-xs text-slate-400">{calls.length}건</p>
          </div>

          {/* 미확인 알림 */}
          <div className={`rounded-2xl px-5 py-4 shadow-sm ring-1 ${unackedAlerts.length > 0 ? "bg-rose-50 ring-rose-200" : "bg-white ring-slate-200"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">미확인 알림</p>
            <p className={`mt-2 text-2xl font-bold ${unackedAlerts.length > 0 ? "text-rose-600" : "text-slate-300"}`}>
              {unackedAlerts.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">미확인 안전 알림</p>
          </div>
        </div>

        {/* 클라이언트 island — 케어 플랜 버튼 + 일정 + 응답 + 모달 */}
        <ElderDetailClient
          parentId={parentId}
          elderName={profile.display_name}
          careTasks={careTasks}
          responses={responses}
          queueByCareTaskId={queueByCareTaskId}
          messageLogByCareTaskId={messageLogByCareTaskId}
          unackedAlerts={unackedAlerts}
        />
      </div>
    </div>
  );
}
