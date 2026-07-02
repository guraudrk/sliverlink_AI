import { z } from "zod";
import { DELIVERY_CHANNEL_OPTIONS } from "../delivery/schema";
import { TASK_TYPE_OPTIONS } from "../care-tasks/task-type";

export const DEFAULT_RAG_TIME_WINDOW_DAYS = 30;

// action-tools.ts의 RagActionIntent와 같은 모양 — /api/rag/confirm-action이 클라이언트로부터 받은
// 명령 의도를 검증한다. care_task_id는 어차피 executeActionIntent 내부에서 RLS 기반 소유권 검증을
// 한 번 더 거치므로(getOwnCareTask), 여기서는 입력 형태만 검증한다.
export const ragActionIntentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("request_care_call"),
    careTaskId: z.string().uuid("careTaskId는 올바른 UUID여야 합니다."),
  }),
  z.object({
    type: z.literal("send_care_message"),
    careTaskId: z.string().uuid("careTaskId는 올바른 UUID여야 합니다."),
    channel: z.enum(DELIVERY_CHANNEL_OPTIONS),
    messageText: z.string().trim().min(1, "messageText는 비어 있을 수 없습니다."),
  }),
  z.object({
    type: z.literal("create_care_task"),
    parentId: z.string().uuid("parentId는 올바른 UUID여야 합니다."),
    senderName: z.string().trim().min(1, "senderName는 비어 있을 수 없습니다."),
    originalRequest: z.string().trim().min(1, "originalRequest는 비어 있을 수 없습니다."),
    taskType: z.enum(TASK_TYPE_OPTIONS).optional(),
  }),
]);

export type RagActionIntentInput = z.infer<typeof ragActionIntentSchema>;

// 확인 버튼을 눌렀을 때 보내는 요청 — parentId는 candidateTasks 필터링 범위를 ask 때와 동일하게
// 유지하기 위함이고(전체/특정 부모님), 실제 소유권 검증은 RLS가 한다.
export const ragConfirmActionRequestSchema = z.object({
  parentId: z.string().uuid("parentId는 올바른 UUID여야 합니다.").optional(),
  intent: ragActionIntentSchema,
  // 챗봇 확인 단계에서 사용자가 메시지 내용을 수정했을 때 덮어쓸 텍스트.
  // send_care_message intent에만 적용되며, 비어 있으면 intent.messageText를 그대로 사용한다.
  overrideMessageText: z.string().trim().optional(),
});

export type RagConfirmActionRequest = z.infer<typeof ragConfirmActionRequestSchema>;

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
