// "action"은 classifyQuery가 만들어내는 값이 아니라, action-service.ts가 명령(전화/메시지)을
// 실제로 실행했을 때 응답에 붙이는 카테고리다(질문 분류와는 다른 경로).
export const RAG_QUERY_CATEGORIES = ["summary", "help", "medication", "calls", "open", "action"] as const;
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
