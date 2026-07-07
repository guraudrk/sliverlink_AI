import { getGeminiClient, getLlmModel } from "../rag/gemini-client";

export type SafetyAlertCategory =
  | "fall_risk"
  | "medication_concern"
  | "mobility_concern"
  | "mental_health_concern"
  | "nutrition_concern"
  | "social_isolation"
  | "urgent_medical";

export type SafetyAlertSeverity = "low" | "medium" | "high";

export type SafetyAlertItem = {
  category: SafetyAlertCategory;
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  suggestion: string | null;
};

const SYSTEM_PROMPT = `당신은 SilverLink AI의 안전 알림 분석기입니다.
AI 안부전화 스크립트와 어르신 반응을 분석하여, 가족이 알아야 할 안전 우려사항을 추출합니다.

분석 지침:
- 통화 스크립트에 언급된 건강·이동·약물·정신건강·영양·사회 고립 관련 내용을 검토하세요
- "도움이 필요해요" 응답은 즉각적인 확인이 필요한 상황입니다 (severity: high)
- "무응답"은 사회적 고립 위험을 나타낼 수 있습니다 (severity: low ~ medium)
- "완료했어요"여도 스크립트 내용에서 우려 사항이 있을 수 있습니다
- 근거 없는 고위험 알림은 생성하지 마세요 — 스크립트나 응답에 실제로 나타난 내용만 분석
- 우려 사항이 없으면 alerts를 비워주세요

카테고리:
- fall_risk: 낙상 위험 (어지러움·이동 어려움·미끄러짐 등)
- medication_concern: 약물 우려 (복용 누락·부작용 등)
- mobility_concern: 이동성 문제 (거동 불편·보조기구 필요 등)
- mental_health_concern: 정신건강 (우울·불안·혼란 등)
- nutrition_concern: 영양 우려 (식사 부족·체중 감소 등)
- social_isolation: 사회적 고립 (혼자 지내는 시간 증가·외출 감소 등)
- urgent_medical: 긴급 의료 필요 (통증·호흡 곤란 등)

severity:
- low: 가볍게 확인 권장
- medium: 이번 주 내 연락 권장
- high: 즉시 확인 필요

반드시 아래 JSON 형식으로만 출력:
{
  "alerts": [
    {
      "category": "...",
      "severity": "low",
      "title": "...",
      "description": "...",
      "suggestion": "..." 또는 null
    }
  ]
}`;

const VALID_CATEGORIES = new Set<string>([
  "fall_risk",
  "medication_concern",
  "mobility_concern",
  "mental_health_concern",
  "nutrition_concern",
  "social_isolation",
  "urgent_medical",
]);

const VALID_SEVERITIES = new Set<string>(["low", "medium", "high"]);

export async function analyzeSafetyAlerts(
  callScript: string,
  parentResponse: string | null,
  status: string
): Promise<SafetyAlertItem[]> {
  try {
    const userContent = `전화 스크립트:\n${callScript}\n\n어르신 응답: ${parentResponse ?? "없음"}\n통화 결과: ${status}`;

    const response = await getGeminiClient().models.generateContent({
      model: getLlmModel(),
      contents: userContent,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text) as { alerts?: unknown[] };

    if (!Array.isArray(parsed.alerts)) return [];

    return parsed.alerts
      .filter(
        (a): a is SafetyAlertItem =>
          a !== null &&
          typeof a === "object" &&
          VALID_CATEGORIES.has((a as SafetyAlertItem).category) &&
          VALID_SEVERITIES.has((a as SafetyAlertItem).severity) &&
          typeof (a as SafetyAlertItem).title === "string" &&
          typeof (a as SafetyAlertItem).description === "string"
      )
      .map((a) => ({
        category: a.category,
        severity: a.severity,
        title: a.title.slice(0, 40),
        description: a.description,
        suggestion: typeof a.suggestion === "string" && a.suggestion.length > 0 ? a.suggestion : null,
      }));
  } catch {
    return [];
  }
}
