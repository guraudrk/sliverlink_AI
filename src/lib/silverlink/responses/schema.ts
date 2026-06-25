import { z } from "zod";

export const RESPONSE_ACTION_OPTIONS = ["completed", "need_help", "remind_later", "wrong_target"] as const;

export const respondActionInputSchema = z.object({
  action: z.enum(RESPONSE_ACTION_OPTIONS),
});

export type RespondActionInput = z.infer<typeof respondActionInputSchema>;
