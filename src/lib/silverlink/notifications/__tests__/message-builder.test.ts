import { describe, expect, it } from "vitest";
import { buildOutboundMessage } from "../message-builder";
import type { CareTask } from "../schema";

const baseTask: CareTask = {
  id: "task_001",
  task_title: "혈압약 복용",
  task_type: "medication",
  target_person: "아버지 테스트",
  task_datetime: "2026-06-24T09:00:00+09:00",
  status: "scheduled",
  priority: "high",
  confirmation_message: "아버지, 혈압약 드실 시간이에요.",
  parent_notified: false,
  notification_status: "none",
  source_channel: "web",
};

describe("buildOutboundMessage", () => {
  it("confirmation_message가 있으면 그대로 사용한다", () => {
    expect(buildOutboundMessage(baseTask)).toBe("아버지, 혈압약 드실 시간이에요.");
  });

  it("confirmation_message가 없으면 task_title과 target_person으로 fallback 메시지를 만든다", () => {
    const task: CareTask = { ...baseTask, confirmation_message: undefined };
    expect(buildOutboundMessage(task)).toBe("아버지 테스트, 혈압약 복용 확인해주세요.");
  });

  it("confirmation_message가 빈 문자열이면 fallback 메시지를 만든다", () => {
    const task: CareTask = { ...baseTask, confirmation_message: "" };
    expect(buildOutboundMessage(task)).toBe("아버지 테스트, 혈압약 복용 확인해주세요.");
  });

  it("target_person이 다른 task(어머니 테스트)도 정확히 반영한다", () => {
    const task: CareTask = {
      ...baseTask,
      target_person: "어머니 테스트",
      task_title: "점심 식사 확인",
      confirmation_message: undefined,
    };
    expect(buildOutboundMessage(task)).toBe("어머니 테스트, 점심 식사 확인 확인해주세요.");
  });
});
