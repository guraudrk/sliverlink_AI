import type { ConversationMessage } from "./schema";

// 너무 긴 히스토리를 그대로 프롬프트에 넣으면 속도/비용에 영향을 준다(Day14 work-log의 속도 튜닝
// 교훈과 같은 이유) — 최근 몇 턴만 쓴다.
export const MAX_HISTORY_TURNS = 6;

// LLM 프롬프트에 끼워 넣을 "이전 대화" 블록. 히스토리가 없으면 빈 문자열을 반환해 프롬프트가
// 불필요하게 길어지지 않게 한다.
export function formatHistoryTranscript(history: ConversationMessage[] | undefined): string {
  if (!history || history.length === 0) return "";
  const recent = history.slice(-MAX_HISTORY_TURNS);
  const lines = recent.map((message) => `${message.role === "user" ? "자녀" : "AI 비서"}: ${message.text}`);
  return `이전 대화:\n${lines.join("\n")}\n\n`;
}

// 벡터 검색(임베딩)용 — "그 중에 도움 필요한 거 있어?"처럼 직전 질문 없이는 의미가 빈약한 후속 질문을
// 위해, 최근 자녀 질문 1~2개를 현재 질문 앞에 붙여서 임베딩한다(질문 분류(classifyQuery)는 그대로
// 현재 질문만 보고 판단한다 — 분류기는 키워드 기반이라 과거 발화가 섞이면 오분류 위험이 더 크다).
export function buildHistoryAwareSearchText(query: string, history: ConversationMessage[] | undefined): string {
  if (!history || history.length === 0) return query;
  const recentUserTurns = history.filter((message) => message.role === "user").slice(-2).map((message) => message.text);
  if (recentUserTurns.length === 0) return query;
  return [...recentUserTurns, query].join(" ");
}
