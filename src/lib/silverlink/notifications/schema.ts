import { z } from "zod";
import { TARGET_PERSON_OPTIONS } from "../target-person";

export const careTaskSchema = z.object({
  id: z.string().min(1),
  task_title: z.string().min(1),
  task_type: z.string().min(1),
  target_person: z.enum(TARGET_PERSON_OPTIONS),
  task_datetime: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["scheduled", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  confirmation_message: z.string().min(1).optional(),
  parent_notified: z.boolean(),
  notification_status: z.enum(["none", "sent"]),
  source_channel: z.literal("web"),
});

export type CareTask = z.infer<typeof careTaskSchema>;
