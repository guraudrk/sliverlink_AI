import { z } from "zod";

// target_person_id: 로그인한 회원이 등록한 parent_profiles 중 선택한 행의 id (Day6+7부터).
// target_person: Make 시나리오 호환을 위해 유지하는 표시용 텍스트(선택된 프로필의 display_name) — 더 이상 고정 enum이 아니다.
export const taskRequestInputSchema = z.object({
  sender_name: z.string().trim().min(1, "sender_name은 비어 있을 수 없습니다."),
  target_person_id: z.string().uuid("target_person_id는 올바른 UUID여야 합니다."),
  target_person: z.string().trim().min(1, "target_person은 비어 있을 수 없습니다."),
  message: z.string().trim().min(1, "message는 비어 있을 수 없습니다."),
});

export type TaskRequestInput = z.infer<typeof taskRequestInputSchema>;

export const taskRequestPayloadSchema = taskRequestInputSchema.extend({
  source_channel: z.literal("web"),
  requested_at: z.string().datetime({ offset: true }),
  today_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "today_date는 YYYY-MM-DD 형식이어야 합니다."),
});

export type TaskRequestPayload = z.infer<typeof taskRequestPayloadSchema>;
