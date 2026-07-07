import type { SocialScore } from "@/lib/supabase/social-scores-repo";
import { Sparkline } from "./sparkline";

type Props = {
  parentName: string;
  scores: SocialScore[]; // week_start 내림차순 (최신이 [0])
};

function scoreColor(score: number) {
  if (score >= 70) return { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", bar: "#10b981" };
  if (score >= 40) return { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", bar: "#f59e0b" };
  return { text: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-200", bar: "#f43f5e" };
}

function scoreLabel(score: number) {
  if (score >= 70) return "활발";
  if (score >= 40) return "보통";
  return "낮음";
}

function weekLabel(weekStart: string) {
  // "2026-06-30" → "6/30주"
  const [, m, d] = weekStart.split("-");
  return `${parseInt(m)}/${parseInt(d)}주`;
}

export function SocialScoreCard({ parentName, scores }: Props) {
  const latest = scores[0];
  const currentScore = latest?.score ?? 0;
  const prevScore = scores[1]?.score ?? null;
  const trend =
    prevScore !== null
      ? currentScore > prevScore
        ? "up"
        : currentScore < prevScore
          ? "down"
          : "flat"
      : null;

  const color = scoreColor(currentScore);

  // 스파크라인용: 오래된 순서로 뒤집어서 점수 배열
  const sparkData = [...scores].reverse().map((s) => s.score);

  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${color.ring} flex flex-col gap-3`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800">{parentName}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color.bg} ${color.text}`}>
          {scoreLabel(currentScore)}
        </span>
      </div>

      {/* 점수 + 스파크라인 */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={`text-4xl font-bold tabular-nums ${color.text}`}>{currentScore}</p>
          <p className="mt-0.5 text-xs text-slate-400">/ 100점</p>
          {trend && (
            <p className={`mt-1 text-xs font-semibold ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-500" : "text-slate-400"}`}>
              {trend === "up" ? "↑ 상승" : trend === "down" ? "↓ 하락" : "→ 유지"}
              {prevScore !== null ? ` (전주 ${prevScore}점)` : ""}
            </p>
          )}
        </div>
        {sparkData.length > 1 ? (
          <Sparkline data={sparkData} width={120} height={40} color={color.bar} />
        ) : (
          <p className="text-xs text-slate-400 pb-1">데이터 축적 중…</p>
        )}
      </div>

      {/* 주별 작은 바 차트 */}
      {scores.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">최근 {scores.length}주 추이</p>
          <div className="flex items-end gap-1" style={{ height: "32px" }}>
            {[...scores].reverse().map((s) => {
              const h = Math.max((s.score / 100) * 32, 3);
              const c = scoreColor(s.score);
              return (
                <div key={s.week_start} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t ${c.bg}`}
                    style={{ height: `${h}px`, backgroundColor: c.bar, opacity: 0.75 }}
                  />
                  <span className="absolute -bottom-4 text-[9px] text-slate-400 hidden group-hover:block whitespace-nowrap">
                    {weekLabel(s.week_start)} {s.score}점
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-300">
            <span>{scores.length > 0 ? weekLabel([...scores].reverse()[0].week_start) : ""}</span>
            <span>{scores.length > 0 ? weekLabel(scores[0].week_start) : ""}</span>
          </div>
        </div>
      )}

      {/* 세부 지표 */}
      {latest && (
        <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">{latest.call_count}</p>
            <p>전화</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">{latest.answered_count}</p>
            <p>응답</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">{latest.response_count}</p>
            <p>링크 응답</p>
          </div>
        </div>
      )}
    </div>
  );
}
