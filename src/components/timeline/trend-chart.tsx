"use client";

import type { WeeklyTrend } from "@/app/api/timeline/route";

type Props = { trends: WeeklyTrend[] };

const W = 600;
const H = 140;
const PAD = { top: 12, right: 16, bottom: 28, left: 32 };

function normalize(val: number, min: number, max: number, lo: number, hi: number) {
  if (max === min) return (lo + hi) / 2;
  return lo + ((val - min) / (max - min)) * (hi - lo);
}

function weekLabel(ws: string) {
  const [, m, d] = ws.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function TrendChart({ trends }: Props) {
  if (trends.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <p className="text-xs text-slate-400">데이터가 2주 이상 쌓이면 차트가 나타나요</p>
      </div>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxCalls = Math.max(...trends.map((t) => t.call_count), 1);
  const maxAlerts = Math.max(...trends.map((t) => t.alert_count), 1);
  const scores = trends.map((t) => t.social_score).filter((s): s is number => s !== null);
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 100;

  const xOf = (i: number) =>
    PAD.left + (i / (trends.length - 1)) * innerW;
  const yOfCall = (v: number) =>
    PAD.top + (1 - v / maxCalls) * innerH;
  const yOfAlert = (v: number) =>
    PAD.top + (1 - v / maxAlerts) * innerH;
  const yOfScore = (v: number) =>
    PAD.top + (1 - normalize(v, minScore, maxScore, 0, 1)) * innerH;

  const callPts = trends.map((t, i) => `${xOf(i)},${yOfCall(t.call_count)}`).join(" ");
  const alertPts = trends
    .filter((t) => t.alert_count > 0)
    .map((t) => {
      const i = trends.indexOf(t);
      return `${xOf(i)},${yOfAlert(t.alert_count)}`;
    })
    .join(" ");
  const scorePts = trends
    .filter((t) => t.social_score !== null)
    .map((t) => {
      const i = trends.indexOf(t);
      return `${xOf(i)},${yOfScore(t.social_score!)}`;
    })
    .join(" ");

  // area fill path for calls
  const callArea =
    `M${xOf(0)},${PAD.top + innerH} ` +
    trends.map((t, i) => `L${xOf(i)},${yOfCall(t.call_count)}`).join(" ") +
    ` L${xOf(trends.length - 1)},${PAD.top + innerH} Z`;

  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-blue-400/60 inline-block" />안부전화</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-rose-400 inline-block" />안전 알림</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-emerald-400 inline-block" />사회 연결 점수</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: "260px" }}
        aria-label="주별 케어 트렌드 차트"
      >
        {/* 그리드 라인 */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            y1={PAD.top + (1 - f) * innerH}
            x2={PAD.left + innerW}
            y2={PAD.top + (1 - f) * innerH}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}

        {/* 통화 에어리어 */}
        <path d={callArea} fill="#3b82f6" fillOpacity={0.08} />

        {/* 통화 라인 */}
        {callPts && (
          <polyline
            points={callPts}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.7}
          />
        )}

        {/* 알림 라인 */}
        {alertPts && (
          <polyline
            points={alertPts}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        )}

        {/* 점수 라인 */}
        {scorePts && (
          <polyline
            points={scorePts}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X축 레이블 */}
        {trends.map((t, i) => {
          if (trends.length > 8 && i % 2 !== 0) return null;
          return (
            <text
              key={t.week_start}
              x={xOf(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {weekLabel(t.week_start)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
