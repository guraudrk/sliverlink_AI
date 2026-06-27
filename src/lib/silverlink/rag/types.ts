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

// "지금 확인할 일" 한 항목. href가 있으면 채팅 UI가 버튼/링크로 보여준다(클릭하면 바로 그 화면으로
// 이동) — href가 없으면(예: action-service.ts의 결과 안내) 그냥 텍스트로만 보여준다.
export type RagNextStep = {
  label: string;
  href?: string;
};

// /api/rag/ask(Day13)의 응답 형태. evidence는 답변에 실제로 인용한 근거만 추려서 담는다.
export type RagAnswer = {
  answerText: string;
  evidence: RagEvidence[];
  nextSteps: RagNextStep[];
  hasSufficientEvidence: boolean;
  // 새 일정이 막 등록됐을 때만 채워진다(action-service.ts) — 채팅 UI가 이 필드를 보고
  // "지금 알려드리기" 버튼(채널 선택 후 send_care_message 의도를 같은 확인 흐름으로 재실행)을 보여준다.
  createdCareTask?: { careTaskId: string; originalRequest: string };
};
