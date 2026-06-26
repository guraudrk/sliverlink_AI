import { describe, expect, it } from "vitest";
import { buildActionAnswer } from "../action-service";

describe("buildActionAnswer", () => {
  it("안부전화 실행 성공 시 확인 문구와 다음 행동을 반환한다", () => {
    const answer = buildActionAnswer({ type: "request_care_call", ok: true, attemptId: "attempt-1" });
    expect(answer.answerText).toContain("안부전화를 걸었어요");
    expect(answer.nextSteps).toContain("안부전화 기록에서 응답 확인하기");
    expect(answer.hasSufficientEvidence).toBe(true);
  });

  it("메시지 발송 성공 시 확인 문구를 반환한다", () => {
    const answer = buildActionAnswer({ type: "send_care_message", ok: true, deliveryAttemptId: "d-1", deliveryStatus: "sent" });
    expect(answer.answerText).toContain("메시지를 보냈어요");
    expect(answer.hasSufficientEvidence).toBe(true);
  });

  it("일정을 찾지 못하면 실패 안내를 반환하고 hasSufficientEvidence는 false다", () => {
    const answer = buildActionAnswer({ ok: false, error: "care_task_not_found" });
    expect(answer.answerText).toContain("일정을 찾을 수 없어요");
    expect(answer.hasSufficientEvidence).toBe(false);
  });

  it("실행 자체가 실패하면 일반적인 실패 안내를 반환한다", () => {
    const answer = buildActionAnswer({ ok: false, error: "execution_failed" });
    expect(answer.answerText).toContain("문제가 생겼어요");
  });
});
