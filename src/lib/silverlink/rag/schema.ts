import { z } from "zod";

export const DEFAULT_RAG_TIME_WINDOW_DAYS = 30;

// 채팅 화면(Day14)이 이전 턴을 함께 보내 "이전 대화 맥락을 기억하는" 답변/명령 판단에 쓴다.
// 평문 텍스트만 주고받는다 — evidence나 RagAnswer 전체를 왔다갔다 보내지 않아 payload를 가볍게 유지한다.
export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

// parentId 없으면 로그인 사용자의 모든 부모님 데이터를 모아 검색한다(소유권 검증은 evidence-service에서 처리).
// /api/rag/evidence와 /api/rag/ask가 입력 형태를 공유한다.
export const ragQueryRequestSchema = z.object({
  query: z.string().trim().min(1, "query는 비어 있을 수 없습니다."),
  parentId: z.string().uuid("parentId는 올바른 UUID여야 합니다.").optional(),
  timeWindowDays: z.number().int().positive().optional(),
  // 너무 길면 프롬프트가 늘어나 속도/비용에 영향을 주므로 20개로 상한(실제로는 conversation-history.ts가
  // 그보다 더 적은 최근 몇 턴만 골라 쓴다 — 이건 입력 검증 단계의 느슨한 상한일 뿐이다).
  history: z.array(conversationMessageSchema).max(20).optional(),
});

export type RagQueryRequest = z.infer<typeof ragQueryRequestSchema>;

// /api/rag/reindex(Day14)용 — query가 없다는 점만 ragQueryRequestSchema와 다르다(질문이 아니라 적재 작업이므로).
export const ragReindexRequestSchema = z.object({
  parentId: z.string().uuid("parentId는 올바른 UUID여야 합니다.").optional(),
  timeWindowDays: z.number().int().positive().optional(),
});

export type RagReindexRequest = z.infer<typeof ragReindexRequestSchema>;
