import type { RagQueryCategory } from "./types";

// 실제 LLM을 호출하지 않는 키워드 기반 분류 — Day11의 inferCallGoal과 동일한 code-first 원칙.
const HELP_KEYWORDS = ["도움", "도와줘", "도와주세요"];
// 단독 "약"은 "요약"/"약속" 등에도 부분 문자열로 걸려 제외한다 — 더 구체적인 표현만 사용.
const MEDICATION_KEYWORDS = ["복약", "투약", "약 드", "약 먹", "혈압", "당뇨", "병원"];
const CALL_KEYWORDS = ["전화", "안부전화", "통화", "콜"];
const SUMMARY_KEYWORDS = ["요약", "정리", "상태", "최근"];

// 우선순위: 도움 요청(가장 중요) > 복약 > 안부전화 > 요약 > 그 외(open).
export function classifyQuery(query: string): RagQueryCategory {
  const text = query.trim();
  if (HELP_KEYWORDS.some((keyword) => text.includes(keyword))) return "help";
  if (MEDICATION_KEYWORDS.some((keyword) => text.includes(keyword))) return "medication";
  if (CALL_KEYWORDS.some((keyword) => text.includes(keyword))) return "calls";
  if (SUMMARY_KEYWORDS.some((keyword) => text.includes(keyword))) return "summary";
  return "open";
}
