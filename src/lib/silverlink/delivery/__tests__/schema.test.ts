import { describe, expect, it } from "vitest";
import { notificationQueueInputSchema } from "../schema";

describe("notificationQueueInputSchema", () => {
  const validInput = {
    care_task_id: "11111111-1111-4111-8111-111111111111",
    channel: "link",
    message_text: "혈압약 드실 시간이에요",
  };

  it("정상 입력(필수 필드만)은 검증을 통과한다", () => {
    expect(notificationQueueInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("voice_call 확장 필드까지 포함해도 통과한다", () => {
    const result = notificationQueueInputSchema.safeParse({
      ...validInput,
      channel: "voice_call",
      call_script: "안녕하세요, SilverLink AI 비서입니다.",
      call_goal: "medication_check",
      max_attempts: 3,
      preferred_call_window: "09:00-11:00",
    });
    expect(result.success).toBe(true);
  });

  it("care_task_id가 UUID가 아니면 실패한다", () => {
    const result = notificationQueueInputSchema.safeParse({ ...validInput, care_task_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("care_task_id가 없으면 실패한다", () => {
    const { care_task_id, ...rest } = validInput;
    expect(notificationQueueInputSchema.safeParse(rest).success).toBe(false);
  });

  it("channel이 허용된 값이 아니면 실패한다", () => {
    const result = notificationQueueInputSchema.safeParse({ ...validInput, channel: "email" });
    expect(result.success).toBe(false);
  });

  it("call_goal이 허용된 값이 아니면 실패한다", () => {
    const result = notificationQueueInputSchema.safeParse({ ...validInput, call_goal: "diagnosis" });
    expect(result.success).toBe(false);
  });

  it("owner_user_id 같은 클라이언트 임의 필드는 스키마에 없어 무시된다", () => {
    const result = notificationQueueInputSchema.safeParse({
      ...validInput,
      owner_user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(true);
    expect(result.success && "owner_user_id" in result.data).toBe(false);
  });
});
