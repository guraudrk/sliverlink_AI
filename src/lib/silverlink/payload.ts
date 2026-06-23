import { taskRequestInputSchema, taskRequestPayloadSchema, type TaskRequestPayload } from "./schema";
import { getRequestedAt, getTodayDate } from "./time";

/**
 * 사용자 입력을 검증하고 Make Webhook으로 보낼 최종 payload를 만든다.
 * 입력이 유효하지 않으면 ZodError를 던진다 (호출자가 400 응답 등으로 매핑).
 */
export function buildSilverLinkPayload(input: unknown, now: Date = new Date()): TaskRequestPayload {
  const validatedInput = taskRequestInputSchema.parse(input);

  return taskRequestPayloadSchema.parse({
    ...validatedInput,
    source_channel: "web",
    requested_at: getRequestedAt(now),
    today_date: getTodayDate(now),
  });
}
