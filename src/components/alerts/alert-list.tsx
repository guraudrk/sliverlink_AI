"use client";

import { useState } from "react";
import type { SafetyAlert } from "@/lib/supabase/safety-alerts-repo";

const CATEGORY_LABEL: Record<string, string> = {
  fall_risk: "낙상 위험",
  medication_concern: "약물 우려",
  mobility_concern: "이동성 문제",
  mental_health_concern: "정신건강",
  nutrition_concern: "영양 우려",
  social_isolation: "사회적 고립",
  urgent_medical: "긴급 의료",
};

const CATEGORY_EMOJI: Record<string, string> = {
  fall_risk: "🚨",
  medication_concern: "💊",
  mobility_concern: "🦯",
  mental_health_concern: "💭",
  nutrition_concern: "🍽️",
  social_isolation: "💌",
  urgent_medical: "🏥",
};

const SEVERITY_STYLE: Record<string, string> = {
  low: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  medium: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  high: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-amber-100 text-amber-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-rose-100 text-rose-700",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "확인 권장",
  medium: "이번 주 연락",
  high: "즉시 확인",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export function AlertList({ initialAlerts }: { initialAlerts: SafetyAlert[] }) {
  const [alerts, setAlerts] = useState<SafetyAlert[]>(initialAlerts);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const unacknowledged = alerts.filter((a) => !a.acknowledged_at);
  const acknowledged = alerts.filter((a) => a.acknowledged_at);

  async function handleAcknowledge(alertId: string) {
    setLoading((prev) => ({ ...prev, [alertId]: true }));
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "PATCH" });
      const data = await res.json();
      if (data.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? (data.alert as SafetyAlert) : a))
        );
      }
    } finally {
      setLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold text-slate-700">안전 알림이 없어요</p>
        <p className="mt-1 text-sm text-slate-500">
          안부전화 완료 후 이상 징후가 감지되면 여기에 표시돼요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {unacknowledged.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-bold text-slate-700">
            미확인 알림
            <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {unacknowledged.length}
            </span>
          </h2>
          <ul className="space-y-3">
            {unacknowledged.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                busy={loading[alert.id] ?? false}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {acknowledged.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-bold text-slate-400">확인 완료</h2>
          <ul className="space-y-3 opacity-60">
            {acknowledged.map((alert) => (
              <AlertCard key={alert.id} alert={alert} busy={false} onAcknowledge={null} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AlertCard({
  alert,
  busy,
  onAcknowledge,
}: {
  alert: SafetyAlert;
  busy: boolean;
  onAcknowledge: ((id: string) => void) | null;
}) {
  return (
    <li className={`rounded-2xl p-5 ${SEVERITY_STYLE[alert.severity] ?? "bg-slate-50 ring-1 ring-slate-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 shrink-0 text-xl leading-none">
            {CATEGORY_EMOJI[alert.category] ?? "⚠️"}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-bold text-slate-800">{alert.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[alert.severity]}`}>
                {SEVERITY_LABEL[alert.severity]}
              </span>
              <span className="text-xs text-slate-500">{CATEGORY_LABEL[alert.category]}</span>
            </div>
            <p className="text-sm text-slate-700">{alert.description}</p>
            {alert.suggestion ? (
              <p className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-xs text-slate-600">
                💡 {alert.suggestion}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">{formatDate(alert.generated_at)}</p>
          </div>
        </div>

        {onAcknowledge ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAcknowledge(alert.id)}
            className="shrink-0 rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "처리 중..." : "확인 완료"}
          </button>
        ) : (
          <span className="shrink-0 text-xs text-slate-400">
            {alert.acknowledged_at ? formatDate(alert.acknowledged_at) + " 확인" : ""}
          </span>
        )}
      </div>
    </li>
  );
}
