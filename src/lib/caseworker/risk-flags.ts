export type RiskFlagType = "urgent" | "worsening" | "unacked_alerts";

export type RiskFlag = {
  type: RiskFlagType;
  label: string;
  reason: string;
};

type FlagInput = {
  latestScore: number | null;
  prevScore: number | null;
  recentCallStatuses: string[];
  unackedAlertCount: number;
};

/** 3가지 rule-based 플래그를 계산한다. 조건을 UI에 투명하게 노출하기 위해 reason 문자열 포함. */
export function computeRiskFlags(elder: FlagInput): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const score = elder.latestScore;
  const recent = elder.recentCallStatuses.slice(0, 3);

  // 🔴 urgent: 연결 점수 ≤ 39 AND 최근 3회 연속 미응답
  if (score !== null && score <= 39 && recent.length >= 3 && recent.every((s) => s === "no_answer")) {
    flags.push({
      type: "urgent",
      label: "즉시 확인",
      reason: `연결 점수 ${score}점 + 3회 연속 미응답`,
    });
  }

  // 🟠 worsening: 점수 40~55 AND 전주 대비 하락
  if (
    score !== null &&
    elder.prevScore !== null &&
    score >= 40 &&
    score <= 55 &&
    elder.prevScore > score
  ) {
    flags.push({
      type: "worsening",
      label: "추세 악화",
      reason: `${elder.prevScore}점 → ${score}점 (전주 대비 ${elder.prevScore - score}점 하락)`,
    });
  }

  // ⚠️ unacked_alerts: 미확인 안전 알림 3건 이상
  if (elder.unackedAlertCount >= 3) {
    flags.push({
      type: "unacked_alerts",
      label: `미확인 알림 ${elder.unackedAlertCount}건`,
      reason: `안전 알림 ${elder.unackedAlertCount}건이 확인되지 않았어요`,
    });
  }

  return flags;
}

/**
 * 카드 정렬용 가중치. 낮을수록 위험 우선순위 높음.
 * urgent → 저점수 → worsening → unacked → 정상 (점수 오름차순)
 */
export function getRiskWeight(flags: RiskFlag[], score: number | null): number {
  if (flags.some((f) => f.type === "urgent")) return 0;
  if (score !== null && score <= 39) return 1;
  if (flags.some((f) => f.type === "worsening")) return 2;
  if (flags.some((f) => f.type === "unacked_alerts")) return 3;
  return 4 + (score ?? 100) / 100;
}
