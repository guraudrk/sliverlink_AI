import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiClient, getLlmModel } from "@/lib/silverlink/rag/gemini-client";

export type BatchElderData = {
  parentId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  scores: Array<{ week_start: string; score: number; call_count: number; answered_count: number }>;
  calls: Array<{ status: string; summary: string | null; created_at: string }>;
  alerts: Array<{ severity: string; title: string; description: string; acknowledged: boolean }>;
  briefs: Array<{ attention_item: string | null; created_at: string }>;
};

const STATUS_KO: Record<string, string> = {
  completed: "완료",
  help_requested: "도움 요청",
  no_answer: "미응답",
  in_progress: "진행 중",
  prepared: "준비됨",
};

// 기존 CARE_REPORT_SYSTEM_PROMPT는 1인·스트리밍용이라 배치 전용 프롬프트를 따로 정의한다.
const BATCH_SYSTEM_PROMPT = `당신은 한국 노인 복지 실무 전문가입니다.
5개 섹션 보고서를 작성한 뒤, ---PASTE--- 구분자와 복붙용 요약을 반드시 함께 출력하세요.

[절대 규칙]
- 제공된 데이터에 없는 내용은 절대 만들어 내지 않습니다
- 데이터가 없는 항목은 정확히 "데이터 부족"이라고 씁니다
- 통화 횟수·응답률 등 수치는 [사실 요약] 섹션의 값을 그대로 씁니다. 다른 숫자를 쓰지 않습니다
- 권장 조치는 반드시 1개만 씁니다. 2개 이상이면 실패입니다
- 의학적 진단·확정적 판단 금지 — 관찰 사실과 경향만 기술합니다
- 5개 섹션 작성 후 반드시 ---PASTE--- 줄을 출력하고, 그 아래에 복붙용 요약을 작성합니다`;

/** 실제 데이터에서 계산된 핵심 수치 (프롬프트에 명시적으로 포함 → AI가 수치를 발명할 여지 없음) */
type ReportFacts = {
  totalCalls: number;
  answeredCalls: number;
  responseRate: string;   // "N%" 형식
  latestScore: number | null;
  prevScore: number | null;
  scoreTrend: string;
};

export function computeReportFacts(data: BatchElderData): ReportFacts {
  const totalCalls = data.calls.length;
  const answeredCalls = data.calls.filter(
    (c) => c.status === "completed" || c.status === "help_requested"
  ).length;
  const responseRate =
    totalCalls > 0 ? `${Math.round((answeredCalls / totalCalls) * 100)}%` : "데이터 부족";

  const latestScore = data.scores.at(-1)?.score ?? null;
  const prevScore   = data.scores.at(-2)?.score ?? null;
  let scoreTrend = "데이터 부족";
  if (latestScore !== null && prevScore !== null) {
    const diff = latestScore - prevScore;
    scoreTrend = diff > 0 ? `${latestScore}점 (전주 대비 ▲${diff}점 상승)`
      : diff < 0 ? `${latestScore}점 (전주 대비 ▼${Math.abs(diff)}점 하락)`
      : `${latestScore}점 (전주 동일)`;
  } else if (latestScore !== null) {
    scoreTrend = `${latestScore}점 (비교 기준 없음)`;
  }

  return { totalCalls, answeredCalls, responseRate, latestScore, prevScore, scoreTrend };
}

export type FactCheckResult = {
  passed: boolean;
  issues: string[];
};

/** 생성된 리포트 텍스트에서 핵심 수치를 추출해 실제 팩트와 비교한다. */
export function verifyReportFacts(
  text: string,
  facts: ReportFacts,
  data: BatchElderData
): FactCheckResult {
  const issues: string[] = [];

  // 데이터 없는데 내용 생성한 경우
  if (data.calls.length === 0 && !text.includes("데이터 부족") && !text.includes("통화 기록 없음")) {
    issues.push("통화 데이터 없음에도 '데이터 부족' 미표기");
  }

  // 통화 횟수 수치 불일치 검사 (숫자+"회" 패턴 추출)
  if (facts.totalCalls > 0) {
    const callCountMatches = [...text.matchAll(/(\d+)\s*회/g)].map((m) => parseInt(m[1], 10));
    const validCounts = callCountMatches.filter((n) => n > 0 && n <= 200);
    // 생성 텍스트에 숫자가 있는데 실제 값과 하나도 일치하지 않으면 의심
    if (validCounts.length > 0 && !validCounts.includes(facts.totalCalls) && !validCounts.includes(facts.answeredCalls)) {
      issues.push(`통화 횟수 불일치: 실제 ${facts.totalCalls}회·응답 ${facts.answeredCalls}회인데 생성 텍스트에 없는 값 포함`);
    }
  }

  // 권장 조치 2개 이상 감지 (번호 매긴 목록 또는 "첫째/둘째" 패턴)
  const actionPatterns = text.match(/권장\s*조치\s*:?([\s\S]{0,300})/i)?.[1] ?? "";
  if ((actionPatterns.match(/\n[-•·①②③]|\d\)\s/g)?.length ?? 0) > 1) {
    issues.push("권장 조치가 2개 이상 감지됨");
  }

  return { passed: issues.length === 0, issues };
}

/** 지정 기간 어르신 데이터를 org 스코프로 병렬 수집. owner_user_id 필터 없음 — RLS가 처리. */
export async function fetchBatchElderData(
  supabase: SupabaseClient,
  parentId: string,
  periodStart: string,
  periodEnd: string
): Promise<BatchElderData | null> {
  const startIso = new Date(periodStart).toISOString();
  const endIso   = new Date(periodEnd + "T23:59:59Z").toISOString();

  const [profileRes, scoresRes, callsRes, alertsRes, briefsRes] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("display_name")
      .eq("id", parentId)
      .maybeSingle(),
    supabase
      .from("social_scores")
      .select("week_start, score, call_count, answered_count")
      .eq("parent_id", parentId)
      .gte("week_start", periodStart)
      .lte("week_start", periodEnd)
      .order("week_start", { ascending: true }),
    supabase
      .from("care_call_attempts")
      .select("status, summary, parent_response, created_at")
      .eq("parent_id", parentId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("safety_alerts")
      .select("severity, title, description, acknowledged_at")
      .eq("elder_id", parentId)
      .gte("generated_at", startIso)
      .lte("generated_at", endIso)
      .order("generated_at", { ascending: false }),
    supabase
      .from("call_family_briefs")
      .select("attention_item, generated_at")
      .eq("elder_id", parentId)
      .gte("generated_at", startIso)
      .lte("generated_at", endIso)
      .order("generated_at", { ascending: false }),
  ]);

  if (!profileRes.data) return null;

  return {
    parentId,
    name: (profileRes.data as { display_name: string }).display_name,
    periodStart,
    periodEnd,
    scores: (scoresRes.data ?? []) as BatchElderData["scores"],
    calls: ((callsRes.data ?? []) as Array<{
      status: string; summary: string | null; parent_response: string | null; created_at: string;
    }>).map((c) => ({ status: c.status, summary: c.summary ?? c.parent_response, created_at: c.created_at })),
    alerts: ((alertsRes.data ?? []) as Array<{
      severity: string; title: string; description: string; acknowledged_at: string | null;
    }>).map((a) => ({ severity: a.severity, title: a.title, description: a.description, acknowledged: !!a.acknowledged_at })),
    briefs: ((briefsRes.data ?? []) as Array<{
      attention_item: string | null; generated_at: string;
    }>).map((b) => ({ attention_item: b.attention_item, created_at: b.generated_at })),
  };
}

export function computeRiskLevel(
  alerts: BatchElderData["alerts"]
): "critical" | "warning" | "normal" {
  const unacked = alerts.filter((a) => !a.acknowledged);
  if (unacked.some((a) => a.severity === "critical" || a.severity === "high")) return "critical";
  if (unacked.some((a) => a.severity === "medium")) return "warning";
  return "normal";
}

export function buildBatchReportPrompt(
  data: BatchElderData,
  facts: ReportFacts,
  orgPasteTemplate?: string,
): string {
  const hasData =
    data.scores.length > 0 || data.calls.length > 0 ||
    data.alerts.length > 0 || data.briefs.length > 0;

  if (!hasData) {
    return `대상자: ${data.name}
보고 기간: ${data.periodStart} ~ ${data.periodEnd}

[사실 요약]
통화 횟수: 0회 / 응답 횟수: 0회 / 응답률: 데이터 부족
연결 점수: 데이터 부족

모든 데이터가 없습니다. 아래 5개 섹션 각각에 "데이터 부족"이라고 쓰세요.

1. 이번 기간 통화 현황

2. 상태 변화 요약

3. 위험 플래그와 근거

4. 특이사항

5. 권장 조치

---PASTE---
[${data.periodStart} ~ ${data.periodEnd}] ${data.name} 어르신
· 통화 0회 중 0회 응답 (응답률 데이터 부족)
· 특이사항: 해당 없음
· 상태: 데이터 부족
· 권장: 정기 모니터링 유지`;
  }

  // 핵심 수치를 계산된 값으로 명시 → AI가 수치를 발명할 여지 제거
  const factSummary = `[사실 요약 — 이 숫자를 그대로 쓰세요]
통화 횟수: ${facts.totalCalls}회 / 응답: ${facts.answeredCalls}회 / 응답률: ${facts.responseRate}
사회 연결 점수 추이: ${facts.scoreTrend}`;

  const scoreLines = data.scores.length > 0
    ? data.scores.map((s) =>
        `  - ${s.week_start} 주: ${s.score}점 (통화 ${s.call_count}회, 응답 ${s.answered_count}회)`
      ).join("\n")
    : "  - 없음";

  const callLines = data.calls.length > 0
    ? data.calls.slice(0, 8).map((c) => {
        const d = new Date(c.created_at).toLocaleDateString("ko-KR");
        return `  - [${d}] ${STATUS_KO[c.status] ?? c.status}${c.summary ? ` — ${c.summary.slice(0, 80)}` : ""}`;
      }).join("\n")
    : "  - 없음";

  const alertLines = data.alerts.length > 0
    ? data.alerts.slice(0, 5).map((a) =>
        `  - [${a.severity}] ${a.title}: ${a.description.slice(0, 80)} (${a.acknowledged ? "확인됨" : "미확인"})`
      ).join("\n")
    : "  - 없음";

  const briefLines = data.briefs.filter((b) => b.attention_item).slice(0, 3)
    .map((b) => `  - ${b.attention_item}`).join("\n") || "  - 없음";

  return `대상자: ${data.name}
보고 기간: ${data.periodStart} ~ ${data.periodEnd}

${factSummary}

=== 주간 연결 점수 ===
${scoreLines}

=== 안부전화 이력 (최대 8건) ===
${callLines}

=== 안전 알림 ===
${alertLines}

=== AI 브리핑 관찰 ===
${briefLines}

위 데이터를 바탕으로 아래 5개 섹션을 순서대로 작성하세요.
[사실 요약]의 수치를 그대로 인용하고, 없는 내용은 반드시 "데이터 부족"으로 쓰세요.

1. 이번 기간 통화 현황 ([사실 요약]의 통화 횟수·응답률 수치를 그대로 포함)

2. 상태 변화 요약 (3줄 이내, 지난 기간 대비 변화 위주)

3. 위험 플래그와 근거 (알림 없으면 "이상 없음", 있으면 알림 제목과 근거 문장)

4. 특이사항 (수면·식사·통증·외출·정서 언급이 있으면 발췌, 없으면 "언급 없음")

5. 권장 조치 (반드시 1개만. 조치 없으면 "정기 모니터링 유지")

5개 섹션 작성 후, 반드시 아래 구분자 줄을 그대로 출력하고 복붙용 요약을 작성하세요.
${buildPasteInstruction(data, facts, orgPasteTemplate)}`;
}

/** paste 지시 블록 생성. 기관 커스텀 템플릿이 있으면 그것을 형식으로 제시한다. */
function buildPasteInstruction(
  data: BatchElderData,
  facts: ReportFacts,
  orgPasteTemplate?: string,
): string {
  const defaultBlock = `
---PASTE---
[${data.periodStart} ~ ${data.periodEnd}] ${data.name} 어르신
· 통화 ${facts.totalCalls}회 중 ${facts.answeredCalls}회 응답 (응답률 ${facts.responseRate})
· 특이사항: (4번 특이사항에서 핵심 1줄. 없으면 "해당 없음")
· 상태: (점수 추이 1줄. 데이터 없으면 "데이터 부족")
· 권장: (5번 권장 조치 그대로 복사)`;

  if (!orgPasteTemplate) return defaultBlock;

  // 기관 템플릿의 변수를 실제 값으로 치환한 뒤, AI가 채워야 할 부분을 안내로 추가
  const filled = orgPasteTemplate
    .replace(/\{\{period\}\}/g, `${data.periodStart} ~ ${data.periodEnd}`)
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{total_calls\}\}/g, String(facts.totalCalls))
    .replace(/\{\{answered_calls\}\}/g, String(facts.answeredCalls))
    .replace(/\{\{response_rate\}\}/g, facts.responseRate)
    .replace(/\{\{attention\}\}/g, "(4번 특이사항에서 핵심 1줄. 없으면 \"해당 없음\")")
    .replace(/\{\{score_state\}\}/g, "(점수 추이 1줄. 데이터 없으면 \"데이터 부족\")")
    .replace(/\{\{recommendation\}\}/g, "(5번 권장 조치 그대로 복사)");

  return `\n---PASTE---\n${filled}`;
}

async function callGemini(prompt: string): Promise<string> {
  const result = await getGeminiClient().models.generateContent({
    model: getLlmModel(),
    contents: prompt,
    config: {
      systemInstruction: BATCH_SYSTEM_PROMPT,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 1536,  // paste 섹션 추가로 여유 확보
    },
  });
  return result.text ?? "";
}

/** AI 파싱 실패 시 수치 기반 fallback paste_text */
function buildFallbackPasteText(data: BatchElderData, facts: ReportFacts): string {
  const scoreState = facts.latestScore !== null ? facts.scoreTrend : "데이터 부족";
  return `[${data.periodStart} ~ ${data.periodEnd}] ${data.name} 어르신
· 통화 ${facts.totalCalls}회 중 ${facts.answeredCalls}회 응답 (응답률 ${facts.responseRate})
· 특이사항: 데이터 부족
· 상태: ${scoreState}
· 권장: 정기 모니터링 유지`;
}

/** AI 응답에서 summary_md와 paste_text를 ---PASTE--- 구분자로 분리 */
function splitReportOutput(
  raw: string,
  data: BatchElderData,
  facts: ReportFacts,
): { summaryMd: string; pasteText: string } {
  const SEPARATOR = "---PASTE---";
  const idx = raw.indexOf(SEPARATOR);
  if (idx === -1) {
    return { summaryMd: raw.trim(), pasteText: buildFallbackPasteText(data, facts) };
  }
  return {
    summaryMd: raw.slice(0, idx).trim(),
    pasteText: raw.slice(idx + SEPARATOR.length).trim(),
  };
}

/**
 * 2단계 사실성 검증 포함 리포트 생성.
 * 1단계: 생성 → 2단계: 팩트 대조 → 불일치 시 재생성 1회.
 * 2차 시도도 실패하면 경고 헤더를 붙여 반환 (배치 전체를 막지 않는다).
 * 반환: summary_md(5섹션 보고서), pasteText(복붙용 4줄), factIssues(검증 경고).
 */
export async function generateBatchReportText(
  data: BatchElderData,
  orgPasteTemplate?: string,
): Promise<{ summaryMd: string; pasteText: string; factIssues: string[] }> {
  const facts  = computeReportFacts(data);
  const prompt = buildBatchReportPrompt(data, facts, orgPasteTemplate);

  let raw   = await callGemini(prompt);
  let { summaryMd, pasteText } = splitReportOutput(raw, data, facts);
  let check = verifyReportFacts(summaryMd, facts, data);

  if (!check.passed) {
    // 재시도: 불일치 내역을 힌트로 포함
    const retryPrompt = `${prompt}

[검증 실패 — 재작성 요청]
이전 출력에서 다음 문제가 발견됐습니다:
${check.issues.map((i) => `- ${i}`).join("\n")}
위 문제를 수정해서 다시 작성하세요.`;

    raw   = await callGemini(retryPrompt);
    ({ summaryMd, pasteText } = splitReportOutput(raw, data, facts));
    check = verifyReportFacts(summaryMd, facts, data);
  }

  // 2차 시도 후에도 문제가 있으면 경고 헤더를 붙여 저장 (배치 멈추지 않음)
  if (!check.passed) {
    const warning = `[자동 검증 경고: ${check.issues.join(" / ")}]\n\n`;
    summaryMd = warning + summaryMd;
  }

  return { summaryMd, pasteText, factIssues: check.passed ? [] : check.issues };
}
