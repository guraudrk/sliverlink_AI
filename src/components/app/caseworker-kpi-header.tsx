import type { ElderSummary } from "@/lib/supabase/caseworker-queries";
import type { RiskFlag } from "@/lib/caseworker/risk-flags";

type Props = {
  elders: Array<ElderSummary & { flags: RiskFlag[] }>;
};

export function CaseworkerKpiHeader({ elders }: Props) {
  const total = elders.length;
  const highRisk = elders.filter(
    (e) =>
      e.flags.some((f) => f.type === "urgent") ||
      (e.latestScore !== null && e.latestScore <= 39)
  ).length;
  const worsening = elders.filter((e) =>
    e.flags.some((f) => f.type === "worsening")
  ).length;
  const totalUnacked = elders.reduce((sum, e) => sum + e.unackedAlertCount, 0);

  const stats = [
    {
      label: "총 담당 어르신",
      value: total,
      unit: "명",
      color: "text-slate-800",
      bg: "bg-slate-50",
      border: "ring-slate-200",
    },
    {
      label: "위험군",
      value: highRisk,
      unit: "명",
      color: highRisk > 0 ? "text-rose-600" : "text-slate-400",
      bg: highRisk > 0 ? "bg-rose-50" : "bg-slate-50",
      border: highRisk > 0 ? "ring-rose-200" : "ring-slate-200",
    },
    {
      label: "추세 악화",
      value: worsening,
      unit: "명",
      color: worsening > 0 ? "text-amber-600" : "text-slate-400",
      bg: worsening > 0 ? "bg-amber-50" : "bg-slate-50",
      border: worsening > 0 ? "ring-amber-200" : "ring-slate-200",
    },
    {
      label: "미확인 알림",
      value: totalUnacked,
      unit: "건",
      color: totalUnacked > 0 ? "text-orange-600" : "text-slate-400",
      bg: totalUnacked > 0 ? "bg-orange-50" : "bg-slate-50",
      border: totalUnacked > 0 ? "ring-orange-200" : "ring-slate-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl px-4 py-4 shadow-sm ring-1 ${stat.bg} ${stat.border} animate-rag-fade-in-up`}
        >
          <p className="text-xs font-medium text-slate-500">{stat.label}</p>
          <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
            {stat.value}
            <span className="ml-0.5 text-sm font-medium">{stat.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
