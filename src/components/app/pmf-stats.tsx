import { createSupabaseServerClient } from "@/lib/supabase/server";

type Stat = {
  label: string;
  value: string;
  sub: string;
  icon: string;
  highlight?: boolean;
};

export async function PmfStats() {
  const supabase = await createSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [r1, r2, r3, r4, r5] = await Promise.all([
    supabase.from("call_recordings").select("*", { count: "exact", head: true }),
    supabase.from("call_recordings").select("*", { count: "exact", head: true }).gte("recorded_at", sevenDaysAgo),
    supabase.from("call_recordings").select("*", { count: "exact", head: true }).eq("status", "analyzed"),
    supabase.from("safety_alerts").select("*", { count: "exact", head: true }),
    supabase.from("safety_alerts").select("*", { count: "exact", head: true }).not("acknowledged_at", "is", null),
  ]);

  const total = r1.count ?? 0;
  const weekly = r2.count ?? 0;
  const analyzed = r3.count ?? 0;
  const totalAlerts = r4.count ?? 0;
  const acked = r5.count ?? 0;

  const analysisRate = total > 0 ? Math.round((analyzed / total) * 100) : 0;
  const alertRate = totalAlerts > 0 ? Math.round((acked / totalAlerts) * 100) : 0;
  const isRetainable = weekly >= 2;

  const stats: Stat[] = [
    {
      icon: "🎙️",
      label: "주간 녹음",
      value: `${weekly}회`,
      sub: "최근 7일",
      highlight: isRetainable,
    },
    {
      icon: "🤖",
      label: "분석 완료율",
      value: `${analysisRate}%`,
      sub: `${analyzed} / ${total}건`,
    },
    {
      icon: "🔔",
      label: "알림 확인율",
      value: `${alertRate}%`,
      sub: `${acked} / ${totalAlerts}건`,
    },
    {
      icon: isRetainable ? "✅" : "📈",
      label: "리텐션 신호",
      value: isRetainable ? "가능" : "2회 필요",
      sub: isRetainable ? "7일 내 2회 이상" : "7일 내 2회 이상 녹음 시",
      highlight: isRetainable,
    },
  ];

  return (
    <div className="animate-rag-fade-in-up" style={{ animationDelay: "80ms" }}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        PMF 지표
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={[
              "rounded-2xl p-4 ring-1 transition-all",
              s.highlight
                ? "bg-blue-50 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-700"
                : "bg-white ring-slate-100 dark:bg-slate-800 dark:ring-slate-700",
            ].join(" ")}
          >
            <p className="text-lg">{s.icon}</p>
            <p
              className={[
                "mt-1.5 text-xl font-bold leading-none",
                s.highlight ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-100",
              ].join(" ")}
            >
              {s.value}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
