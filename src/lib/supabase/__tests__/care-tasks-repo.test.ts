import { describe, expect, it } from "vitest";
import { getOwnCareTask, isOwnParentProfile, selectUnsentCareTasks, type CareTaskSummary } from "../care-tasks-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeSummary(overrides: Partial<CareTaskSummary> = {}): CareTaskSummary {
  return {
    id: "t1",
    parent_id: "p1",
    target_person: "어머니",
    original_request: "오늘 점심 드셨는지 확인",
    status: "scheduled",
    priority: "normal",
    task_type: "meal",
    completed_at: null,
    notification_status: null,
    created_at: "2026-06-27T00:00:00Z",
    ...overrides,
  };
}

function makeStubClient(maybeSingleResult: { data: unknown; error: unknown }): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => maybeSingleResult,
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("isOwnParentProfile", () => {
  it("RLS를 통과해 행이 보이면(=내 소유) true를 반환한다", async () => {
    const supabase = makeStubClient({ data: { id: "p1" }, error: null });
    expect(await isOwnParentProfile(supabase, "p1")).toBe(true);
  });

  it("RLS에 걸려 0건이면(남의 프로필이거나 존재하지 않음) false를 반환한다", async () => {
    const supabase = makeStubClient({ data: null, error: null });
    expect(await isOwnParentProfile(supabase, "other-id")).toBe(false);
  });

  it("쿼리 자체가 에러면 throw한다", async () => {
    const supabase = makeStubClient({ data: null, error: new Error("boom") });
    await expect(isOwnParentProfile(supabase, "p1")).rejects.toThrow();
  });
});

describe("getOwnCareTask", () => {
  it("RLS를 통과해 행이 보이면(=내 소유) 그 행을 반환한다", async () => {
    const row = { id: "t1", owner_user_id: "u1", parent_id: "p1", target_person: "아버지", status: "scheduled" };
    const supabase = makeStubClient({ data: row, error: null });
    expect(await getOwnCareTask(supabase, "t1")).toEqual(row);
  });

  it("RLS에 걸려 0건이면(남의 care_task이거나 존재하지 않음) null을 반환한다", async () => {
    const supabase = makeStubClient({ data: null, error: null });
    expect(await getOwnCareTask(supabase, "other-id")).toBeNull();
  });

  it("쿼리 자체가 에러면 throw한다", async () => {
    const supabase = makeStubClient({ data: null, error: new Error("boom") });
    await expect(getOwnCareTask(supabase, "t1")).rejects.toThrow();
  });
});

describe("selectUnsentCareTasks", () => {
  it("완료된 일정은 미발송 목록에서 뺀다", () => {
    const tasks = [makeSummary({ id: "t1", status: "completed", notification_status: null })];
    expect(selectUnsentCareTasks(tasks)).toHaveLength(0);
  });

  it("notification_status가 'sent'인 일정은 미발송 목록에서 뺀다", () => {
    const tasks = [makeSummary({ id: "t1", notification_status: "sent" })];
    expect(selectUnsentCareTasks(tasks)).toHaveLength(0);
  });

  it("완료되지 않았고 아직 발송하지 않은(null/레거시 'none'/'prepared') 일정은 남긴다", () => {
    const tasks = [
      makeSummary({ id: "t1", notification_status: null }),
      makeSummary({ id: "t2", notification_status: "none" }),
      makeSummary({ id: "t3", notification_status: "prepared" }),
    ];
    expect(selectUnsentCareTasks(tasks).map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });
});
