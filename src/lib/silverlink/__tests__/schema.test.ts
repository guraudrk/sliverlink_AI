import { describe, expect, it } from "vitest";
import { taskRequestInputSchema, taskRequestPayloadSchema } from "../schema";

const VALID_TARGET_PERSON_ID = "11111111-1111-4111-8111-111111111111";

describe("taskRequestInputSchema", () => {
  const validInput = {
    sender_name: "김자녀",
    target_person_id: VALID_TARGET_PERSON_ID,
    target_person: "아버지 A",
    message: "오늘 병원 방문 일정 확인 부탁드려요.",
  };

  it("정상 입력은 검증을 통과한다", () => {
    const result = taskRequestInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("sender_name이 빈 문자열이면 실패한다", () => {
    const result = taskRequestInputSchema.safeParse({ ...validInput, sender_name: "" });
    expect(result.success).toBe(false);
  });

  it("sender_name이 공백뿐이면 실패한다", () => {
    const result = taskRequestInputSchema.safeParse({ ...validInput, sender_name: "   " });
    expect(result.success).toBe(false);
  });

  it("message가 빈 문자열이면 실패한다", () => {
    const result = taskRequestInputSchema.safeParse({ ...validInput, message: "" });
    expect(result.success).toBe(false);
  });

  it("target_person은 더 이상 고정값으로 제한되지 않는다 (등록된 부모님 이름이면 통과)", () => {
    const result = taskRequestInputSchema.safeParse({ ...validInput, target_person: "어머니 테스트" });
    expect(result.success).toBe(true);
  });

  it("target_person이 빈 문자열이면 실패한다", () => {
    const result = taskRequestInputSchema.safeParse({ ...validInput, target_person: "" });
    expect(result.success).toBe(false);
  });

  it("target_person_id가 UUID 형식이 아니면 실패한다", () => {
    const result = taskRequestInputSchema.safeParse({ ...validInput, target_person_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("taskRequestPayloadSchema", () => {
  const validPayload = {
    sender_name: "김자녀",
    target_person_id: VALID_TARGET_PERSON_ID,
    target_person: "아버지 A",
    message: "오늘 병원 방문 일정 확인 부탁드려요.",
    source_channel: "web",
    requested_at: "2026-06-23T00:30:00+09:00",
    today_date: "2026-06-23",
  };

  it("정상 payload는 검증을 통과한다", () => {
    expect(taskRequestPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it("source_channel이 web이 아니면 실패한다", () => {
    const result = taskRequestPayloadSchema.safeParse({ ...validPayload, source_channel: "kakao" });
    expect(result.success).toBe(false);
  });

  it("requested_at이 ISO datetime 형식이 아니면 실패한다", () => {
    const result = taskRequestPayloadSchema.safeParse({ ...validPayload, requested_at: "2026-06-23" });
    expect(result.success).toBe(false);
  });

  it("today_date가 YYYY-MM-DD 형식이 아니면 실패한다", () => {
    const result = taskRequestPayloadSchema.safeParse({ ...validPayload, today_date: "2026/06/23" });
    expect(result.success).toBe(false);
  });
});
