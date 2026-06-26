// "action"/"action_pending"은 classifyQuery가 만들어내는 값이 아니라, 명령(전화/메시지) 경로에서만
// 붙는 카테고리다. "action_pending"은 LLM이 명령 의도를 감지했지만 아직 실행 전 사용자 확인을
// 기다리는 상태, "action"은 사용자가 확인을 눌러 실제로 실행이 끝난 상태다.
// "task_request"는 "일정 만들어줘"처럼 새 일정 등록을 요청하는 명령 — 근거 데이터로 답할 질문이
// 아니라서(evidence-builder.ts가 항상 빈 배열을 반환) "open"처럼 전체 근거를 덤프하지 않는다.
export const RAG_QUERY_CATEGORIES = [
  "summary",
  "help",
  "medication",
  "calls",
  "task_request",
  "open",
  "action",
  "action_pending",
] as const;
export type RagQueryCategory = (typeof RAG_QUERY_CATEGORIES)[number];

export const RAG_SOURCE_TYPES = [
  "parent_profile",
  "care_task",
  "message_log",
  "notification_queue",
  "care_call_attempt",
  "delivery_attempt",
] as const;
export type RagSourceType = (typeof RAG_SOURCE_TYPES)[number];

export const RAG_IMPORTANCE_LEVELS = ["low", "medium", "high"] as const;
export type RagImportance = (typeof RAG_IMPORTANCE_LEVELS)[number];

// LLM(Day13)에는 DB row를 그대로 넘기지 않고 이 정규화된 형태로만 전달한다.
export type RagEvidence = {
  id: string;
  sourceType: RagSourceType;
  parentId: string;
  title: string;
  summary: string;
  rawText: string;
  createdAt: string;
  importance: RagImportance;
  safetyFlags: string[];
};

// /api/rag/ask(Day13)의 응답 형태. evidence는 답변에 실제로 인용한 근거만 추려서 담는다.
export type RagAnswer = {
  answerText: string;
  evidence: RagEvidence[];
  nextSteps: string[];
  hasSufficientEvidence: boolean;
};
