import type { RagQueryCategory } from "./types";

// 실제 LLM을 호출하지 않는 키워드 기반 분류 — Day11의 inferCallGoal과 동일한 code-first 원칙.
const HELP_KEYWORDS = ["도움", "도와줘", "도와주세요"];
// 단독 "약"은 "요약"/"약속" 등에도 부분 문자열로 걸려 제외한다 — 더 구체적인 표현만 사용.
const MEDICATION_KEYWORDS = ["복약", "투약", "약 드", "약 먹", "혈압", "당뇨", "병원"];
const CALL_KEYWORDS = ["전화", "안부전화", "통화", "콜"];
const SUMMARY_KEYWORDS = ["요약", "정리", "상태", "최근"];
// "병원 다녀오셨는지 확인하는 일정 만들어줘"처럼 명령 안에 다른 카테고리 키워드(병원 등)가 같이 섞여
// 있을 수 있어, 새 일정 등록 명령인지를 가장 먼저 확인한다 — 명령은 근거로 답할 질문이 아니므로
// 내용에 어떤 주제 키워드가 있든 evidence-builder.ts가 항상 빈 근거를 반환해야 한다.
const TASK_REQUEST_KEYWORDS = [
  "만들어줘",
  "만들어 줘",
  "만들래",
  "등록해줘",
  "등록해 줘",
  "등록할래",
  "추가해줘",
  "추가해 줘",
  "새 일정",
];

// 우선순위: 새 일정 등록 명령(다른 주제 키워드보다 먼저) > 도움 요청 > 복약 > 안부전화 > 요약 > 그 외(open).
export function classifyQuery(query: string): RagQueryCategory {
  const text = query.trim();
  if (TASK_REQUEST_KEYWORDS.some((keyword) => text.includes(keyword))) return "task_request";
  if (HELP_KEYWORDS.some((keyword) => text.includes(keyword))) return "help";
  if (MEDICATION_KEYWORDS.some((keyword) => text.includes(keyword))) return "medication";
  if (CALL_KEYWORDS.some((keyword) => text.includes(keyword))) return "calls";
  if (SUMMARY_KEYWORDS.some((keyword) => text.includes(keyword))) return "summary";
  return "open";
}
