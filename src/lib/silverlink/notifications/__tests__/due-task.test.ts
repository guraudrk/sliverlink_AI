import { describe, expect, it } from "vitest";
import { isDueTask } from "../due-task";
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

describe("isDueTask", () => {
  it("task_datetime이 now보다 이전이면 due다", () => {
    const task: CareTask = { ...baseTask, task_datetime: "2026-06-24T08:00:00+09:00" };
    expect(isDueTask(task, FIXED_NOW)).toBe(true);
  });

  it("task_datetime이 now와 같으면 due다", () => {
    const task: CareTask = { ...baseTask, task_datetime: "2026-06-24T09:00:00+09:00" };
    expect(isDueTask(task, FIXED_NOW)).toBe(true);
  });

  it("status가 completed이면 due가 아니다", () => {
    const task: CareTask = { ...baseTask, status: "completed" };
    expect(isDueTask(task, FIXED_NOW)).toBe(false);
  });

  it("parent_notified가 true이면 due가 아니다", () => {
    const task: CareTask = { ...baseTask, parent_notified: true };
    expect(isDueTask(task, FIXED_NOW)).toBe(false);
  });

  it("task_datetime이 미래면 due가 아니다", () => {
    const task: CareTask = { ...baseTask, task_datetime: "2026-06-25T18:00:00+09:00" };
    expect(isDueTask(task, FIXED_NOW)).toBe(false);
  });

  it("task_datetime이 없으면 due가 아니다", () => {
    const task: CareTask = { ...baseTask, task_datetime: undefined };
    expect(isDueTask(task, FIXED_NOW)).toBe(false);
  });
});
