import { describe, expect, it } from "vitest";
import { buildActionAnswer } from "../action-service";

describe("buildActionAnswer", () => {
  it("안부전화 실행 성공 시 확인 문구와 다음 행동을 반환한다", () => {
    const answer = buildActionAnswer({ type: "request_care_call", ok: true, attemptId: "attempt-1" });
    expect(answer.answerText).toContain("안부전화를 걸었어요");
    expect(answer.nextSteps).toContainEqual({ label: "안부전화 기록에서 응답 확인하기", href: "/dashboard/calls" });
    expect(answer.hasSufficientEvidence).toBe(true);
  });

  it("새 일정 등록 성공 시 유형 라벨을 포함한 확인 문구와 후속 알림 발송용 정보를 반환한다", () => {
    const answer = buildActionAnswer({
      type: "create_care_task",
      ok: true,
      careTaskId: "task-1",
      taskType: "meal",
      originalRequest: "오늘 점심 드셨는지 확인해 주세요",
    });
    expect(answer.answerText).toContain("새 일정을 등록했어요");
    expect(answer.answerText).toContain("식사");
    expect(answer.hasSufficientEvidence).toBe(true);
    expect(answer.createdCareTask).toEqual({ careTaskId: "task-1", originalRequest: "오늘 점심 드셨는지 확인해 주세요" });
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
