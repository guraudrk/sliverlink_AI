import { describe, expect, it } from "vitest";
import { prepareNotification, prepareNotifications } from "../notification-engine";
import type { CareTask } from "../schema";

const FIXED_NOW = new Date("2026-06-24T00:00:00Z"); // Asia/Seoul: 2026-06-24 09:00:00+09:00

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

describe("prepareNotification", () => {
  it("due한 복약 task는 outbound candidate와 patch를 생성한다", () => {
    const result = prepareNotification(baseTask, FIXED_NOW);

    expect(result).toEqual({
      taskId: "task_001",
      taskTitle: "혈압약 복용",
      outboundLogCandidate: {
        direction: "outbound",
        status: "prepared",
        source_channel: "system",
        receiver: "아버지 테스트",
        raw_message: "아버지, 혈압약 드실 시간이에요.",
        related_task: "task_001",
      },
      taskUpdatePatch: {
        parent_notified: true,
        notification_status: "prepared",
        last_notification_at: "2026-06-24T09:00:00+09:00",
      },
    });
  });

  it("미래 task는 건너뛴다", () => {
    const task: CareTask = { ...baseTask, task_datetime: "2026-06-25T18:00:00+09:00" };
    expect(prepareNotification(task, FIXED_NOW)).toBeNull();
  });

  it("이미 알림을 보낸 task는 건너뛴다", () => {
    const task: CareTask = { ...baseTask, parent_notified: true };
    expect(prepareNotification(task, FIXED_NOW)).toBeNull();
  });

  it("완료된 task는 건너뛴다", () => {
    const task: CareTask = { ...baseTask, status: "completed" };
    expect(prepareNotification(task, FIXED_NOW)).toBeNull();
  });

  it("confirmation_message가 없으면 fallback 메시지를 raw_message로 사용한다", () => {
    const task: CareTask = { ...baseTask, confirmation_message: undefined };
    const result = prepareNotification(task, FIXED_NOW);
    expect(result?.outboundLogCandidate.raw_message).toBe("아버지 테스트, 혈압약 복용 확인해주세요.");
  });

  it("status는 항상 prepared이며 sent로 표시하지 않는다", () => {
    const result = prepareNotification(baseTask, FIXED_NOW);
    expect(result?.outboundLogCandidate.status).toBe("prepared");
    expect(result?.taskUpdatePatch.notification_status).toBe("prepared");
  });
});

describe("prepareNotifications", () => {
  it("due task만 후보로 반환하고 미래/완료/이미발송 task는 제외한다", () => {
    const tasks: CareTask[] = [
      baseTask,
      { ...baseTask, id: "task_003", task_datetime: "2026-06-25T18:00:00+09:00" },
      { ...baseTask, id: "task_004", parent_notified: true },
      { ...baseTask, id: "task_005", status: "completed" },
    ];

    const results = prepareNotifications(tasks, FIXED_NOW);

    expect(results).toHaveLength(1);
    expect(results[0].taskId).toBe("task_001");
  });
});
