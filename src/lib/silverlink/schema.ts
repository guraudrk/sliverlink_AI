import { z } from "zod";
import { TARGET_PERSON_OPTIONS } from "./target-person";

export { TARGET_PERSON_OPTIONS };

export const taskRequestInputSchema = z.object({
  sender_name: z.string().trim().min(1, "sender_name은 비어 있을 수 없습니다."),
  target_person: z.enum(TARGET_PERSON_OPTIONS, {
    message: `target_person은 ${TARGET_PERSON_OPTIONS.join(", ")} 중 하나여야 합니다.`,
  }),
  message: z.string().trim().min(1, "message는 비어 있을 수 없습니다."),
});

export type TaskRequestInput = z.infer<typeof taskRequestInputSchema>;

export const taskRequestPayloadSchema = taskRequestInputSchema.extend({
  source_channel: z.literal("web"),
  requested_at: z.string().datetime({ offset: true }),
  today_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "today_date는 YYYY-MM-DD 형식이어야 합니다."),
});

export type TaskRequestPayload = z.infer<typeof taskRequestPayloadSchema>;
