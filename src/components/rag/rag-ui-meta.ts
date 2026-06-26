// care-assistant-panel.tsx와 evidence-detail-modal.tsx가 같이 쓰는 표시용 메타 정보.
export const IMPORTANCE_BADGE_CLASS: Record<string, string> = {
  high: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  medium: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  low: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

export const SOURCE_TYPE_META: Record<string, { label: string; dot: string }> = {
  parent_profile: { label: "프로필", dot: "bg-violet-400" },
  care_task: { label: "일정", dot: "bg-blue-400" },
  message_log: { label: "메시지", dot: "bg-teal-400" },
  notification_queue: { label: "알림", dot: "bg-indigo-400" },
  care_call_attempt: { label: "안부전화", dot: "bg-pink-400" },
  delivery_attempt: { label: "발송 시도", dot: "bg-slate-400" },
};

export const CATEGORY_META: Record<string, { label: string; className: string }> = {
  summary: { label: "요약", className: "bg-blue-50 text-blue-600 ring-1 ring-blue-200" },
  help: { label: "도움 요청", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  medication: { label: "복약", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  calls: { label: "안부전화", className: "bg-pink-50 text-pink-600 ring-1 ring-pink-200" },
  open: { label: "자유 질문", className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
  action: { label: "명령 실행", className: "bg-violet-50 text-violet-600 ring-1 ring-violet-200" },
};

const SAFETY_FLAG_LABELS: Record<string, string> = {
  help_requested: "도움 요청",
  medication_related: "복약 관련",
  "risk:low": "위험도 낮음",
  "risk:medium": "위험도 보통",
  "risk:high": "위험도 높음",
};

export function safetyFlagLabel(flag: string): string {
  return SAFETY_FLAG_LABELS[flag] ?? flag;
}

// evidence-builder가 parent_profile 근거에 시점 없는 배경 정보임을 표시하려고 epoch(0)을 넣어둔다.
const EPOCH_ISO = new Date(0).toISOString();

export function formatEvidenceDate(value: string): string {
  if (value === EPOCH_ISO) return "상시 (배경 정보)";
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}
