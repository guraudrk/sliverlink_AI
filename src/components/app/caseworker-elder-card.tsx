import Link from "next/link";
import type { ElderSummary } from "@/lib/supabase/caseworker-queries";
import type { RiskFlag } from "@/lib/caseworker/risk-flags";

type Props = {
  elder: ElderSummary & { flags: RiskFlag[] };
  index: number;
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null)
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
        점수 없음
      </span>
    );
  if (score >= 70)
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        {score}점 · 활발
      </span>
    );
  if (score >= 40)
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        {score}점 · 보통
      </span>
    );
  return (
    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
      {score}점 · 낮음
    </span>
  );
}

function FlagBadge({ flag }: { flag: RiskFlag }) {
  if (flag.type === "urgent")
    return (
      <span
        title={flag.reason}
        className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white"
      >
        🔴 {flag.label}
      </span>
    );
  if (flag.type === "worsening")
    return (
      <span
        title={flag.reason}
        className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
      >
        🟠 {flag.label}
      </span>
    );
  return (
    <span
      title={flag.reason}
      className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-200"
    >
      ⚠️ {flag.label}
    </span>
  );
}

function CallDots({ statuses }: { statuses: string[] }) {
  if (statuses.length === 0)
    return <span className="text-xs text-slate-400">통화 기록 없음</span>;
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400">최근 통화</span>
      {statuses.map((s, i) => (
        <span
          key={i}
          title={s === "no_answer" ? "미응답" : s === "answered" ? "응답" : s}
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            s === "answered"
              ? "bg-emerald-400"
              : s === "no_answer"
                ? "bg-rose-400"
                : "bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export function CaseworkerElderCard({ elder, index }: Props) {
  const hasUrgent = elder.flags.some((f) => f.type === "urgent");

  return (
    <Link
      href={`/dashboard/parents/${elder.id}`}
      className={`block rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 transition-all hover:shadow-md hover:ring-blue-300 animate-rag-fade-in-up ${
        hasUrgent ? "ring-rose-300" : "ring-slate-200"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 왼쪽: 이름 + 관계 */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-slate-800">
              {elder.display_name}
            </p>
            {elder.relationship && (
              <span className="shrink-0 text-xs text-slate-400">
                {elder.relationship}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ScoreBadge score={elder.latestScore} />
            {elder.flags.map((flag) => (
              <FlagBadge key={flag.type} flag={flag} />
            ))}
          </div>
          <div className="mt-2">
            <CallDots statuses={elder.recentCallStatuses} />
          </div>
        </div>

        {/* 오른쪽: 화살표 */}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-1 h-4 w-4 shrink-0 text-slate-300"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </Link>
  );
}
