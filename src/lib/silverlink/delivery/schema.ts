import { z } from "zod";

export const DELIVERY_CHANNEL_OPTIONS = ["link", "sms", "kakao_alimtalk", "voice_call", "web_push"] as const;
export const CALL_GOAL_OPTIONS = [
  "reminder",
  "wellbeing_check",
  "medication_check",
  "meal_check",
  "emergency_check",
] as const;

// parent_id/owner_user_id는 care_task_id 소유권 검증으로 서버가 derive하므로 입력 스키마에 없다.
export const notificationQueueInputSchema = z.object({
  care_task_id: z.string().uuid("care_task_id는 올바른 UUID여야 합니다."),
  channel: z.enum(DELIVERY_CHANNEL_OPTIONS),
  message_text: z.string().trim().optional(),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
  call_script: z.string().trim().optional(),
  call_goal: z.enum(CALL_GOAL_OPTIONS).optional(),
  max_attempts: z.number().int().positive().optional(),
  preferred_call_window: z.string().trim().optional(),
});

export type NotificationQueueInput = z.infer<typeof notificationQueueInputSchema>;
