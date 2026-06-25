import { describe, expect, it } from "vitest";
import { respondActionInputSchema } from "../schema";

describe("respondActionInputSchema", () => {
  it("허용된 action 4종은 모두 통과한다", () => {
    for (const action of ["completed", "need_help", "remind_later", "wrong_target"]) {
      expect(respondActionInputSchema.safeParse({ action }).success).toBe(true);
    }
  });

  it("허용 안 된 action이면 실패한다", () => {
    expect(respondActionInputSchema.safeParse({ action: "delete_account" }).success).toBe(false);
  });

  it("action이 없으면 실패한다", () => {
    expect(respondActionInputSchema.safeParse({}).success).toBe(false);
  });
});
