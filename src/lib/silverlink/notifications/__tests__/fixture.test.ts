import { describe, expect, it } from "vitest";
import { loadCareTaskFixtures } from "../fixture";

describe("loadCareTaskFixtures", () => {
  it("data/fixtures/care-tasks.day5.json을 careTaskSchema에 맞게 5건 로드한다", () => {
    const tasks = loadCareTaskFixtures();
    expect(tasks).toHaveLength(5);
    expect(tasks.map((task) => task.id)).toEqual([
      "task_001",
      "task_002",
      "task_003",
      "task_004",
      "task_005",
    ]);
  });

  it("이미 알림을 보낸 케이스(task_004)가 parent_notified: true로 로드된다", () => {
    const tasks = loadCareTaskFixtures();
    const task004 = tasks.find((task) => task.id === "task_004");
    expect(task004?.parent_notified).toBe(true);
  });

  it("완료된 케이스(task_005)가 status: completed로 로드된다", () => {
    const tasks = loadCareTaskFixtures();
    const task005 = tasks.find((task) => task.id === "task_005");
    expect(task005?.status).toBe("completed");
  });
});
