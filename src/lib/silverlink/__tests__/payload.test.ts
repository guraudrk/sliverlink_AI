import { describe, expect, it } from "vitest";
import { buildSilverLinkPayload } from "../payload";

const FIXED_NOW = new Date("2026-06-22T15:30:00Z"); // Asia/Seoul: 2026-06-23 00:30:00+09:00
const VALID_TARGET_PERSON_ID = "11111111-1111-4111-8111-111111111111";

const validInput = {
  sender_name: "김자녀",
  target_person_id: VALID_TARGET_PERSON_ID,
  target_person: "아버지 A",
  message: "오늘 병원 방문 일정 확인 부탁드려요.",
};

describe("buildSilverLinkPayload", () => {
  it("정상 입력이면 payload 생성에 성공한다", () => {
    const payload = buildSilverLinkPayload(validInput, FIXED_NOW);

    expect(payload).toEqual({
      sender_name: "김자녀",
      target_person_id: VALID_TARGET_PERSON_ID,
      target_person: "아버지 A",
      message: "오늘 병원 방문 일정 확인 부탁드려요.",
      source_channel: "web",
      requested_at: "2026-06-23T00:30:00+09:00",
      today_date: "2026-06-23",
    });
  });

  it("source_channel은 항상 web으로 들어간다", () => {
    const payload = buildSilverLinkPayload(validInput, FIXED_NOW);
    expect(payload.source_channel).toBe("web");
  });

  it("message가 비어 있으면 실패한다", () => {
    expect(() => buildSilverLinkPayload({ ...validInput, message: "" }, FIXED_NOW)).toThrow();
  });

  it("target_person_id가 UUID가 아니면 실패한다", () => {
    expect(() =>
      buildSilverLinkPayload({ ...validInput, target_person_id: "not-a-uuid" }, FIXED_NOW)
    ).toThrow();
  });

  it("sender_name이 비어 있으면 실패한다", () => {
    expect(() => buildSilverLinkPayload({ ...validInput, sender_name: "" }, FIXED_NOW)).toThrow();
  });
});
