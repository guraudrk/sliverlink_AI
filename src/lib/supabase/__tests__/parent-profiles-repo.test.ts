import { describe, expect, it } from "vitest";
import { parentProfileInputSchema } from "../parent-profiles-repo";

describe("parentProfileInputSchema", () => {
  const validInput = {
    display_name: "아버지 테스트",
    relationship: "아버지",
    phone: "010-0000-0001",
    notification_preference: "sms",
    care_context: "최근 약 복용 확인이 필요함",
    daily_routine: "오전 9시에 약, 오후 3시에 산책",
    medication_notes: "혈압약 복용 알림 필요",
    communication_style: "짧고 다정하게 말하기",
    memo: "테스트 데이터",
  };

  it("정상 입력은 검증을 통과한다", () => {
    expect(parentProfileInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("display_name만 있어도 통과한다 (나머지는 선택)", () => {
    const result = parentProfileInputSchema.safeParse({ display_name: "어머니 테스트" });
    expect(result.success).toBe(true);
  });

  it("display_name이 없으면 실패한다", () => {
    const { display_name, ...rest } = validInput;
    expect(parentProfileInputSchema.safeParse(rest).success).toBe(false);
  });

  it("display_name이 빈 문자열이면 실패한다", () => {
    const result = parentProfileInputSchema.safeParse({ ...validInput, display_name: "" });
    expect(result.success).toBe(false);
  });

  it("display_name이 공백뿐이면 실패한다", () => {
    const result = parentProfileInputSchema.safeParse({ ...validInput, display_name: "   " });
    expect(result.success).toBe(false);
  });

  it("notification_preference가 허용된 값이 아니면 실패한다", () => {
    const result = parentProfileInputSchema.safeParse({ ...validInput, notification_preference: "email" });
    expect(result.success).toBe(false);
  });

  it("owner_user_id 같은 클라이언트 임의 필드는 스키마에 없어 무시된다", () => {
    const result = parentProfileInputSchema.safeParse({
      ...validInput,
      owner_user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(true);
    expect(result.success && "owner_user_id" in result.data).toBe(false);
  });
});
