export const RAG_QUERY_CATEGORIES = ["summary", "help", "medication", "calls", "open"] as const;
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
