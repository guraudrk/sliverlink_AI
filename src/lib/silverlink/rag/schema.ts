import { z } from "zod";

export const DEFAULT_RAG_TIME_WINDOW_DAYS = 30;

// parentId 없으면 로그인 사용자의 모든 부모님 데이터를 모아 검색한다(소유권 검증은 라우트에서 처리).
export const ragEvidenceRequestSchema = z.object({
  query: z.string().trim().min(1, "query는 비어 있을 수 없습니다."),
  parentId: z.string().uuid("parentId는 올바른 UUID여야 합니다.").optional(),
  timeWindowDays: z.number().int().positive().optional(),
});

export type RagEvidenceRequest = z.infer<typeof ragEvidenceRequestSchema>;
