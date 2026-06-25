import { z } from "zod";

export const ATTEMPT_RESPONSE_OPTIONS = ["completed", "help_requested", "no_answer"] as const;

export const createCallAttemptInputSchema = z.object({
  care_task_id: z.string().uuid("care_task_id는 올바른 UUID여야 합니다."),
});

export type CreateCallAttemptInput = z.infer<typeof createCallAttemptInputSchema>;

export const respondCallAttemptInputSchema = z.object({
  action: z.enum(ATTEMPT_RESPONSE_OPTIONS),
});

export type RespondCallAttemptInput = z.infer<typeof respondCallAttemptInputSchema>;
