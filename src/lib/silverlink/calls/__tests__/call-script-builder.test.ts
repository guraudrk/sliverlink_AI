import { describe, expect, it } from "vitest";
import { buildCallScript, formatCallScriptText, inferCallGoal } from "../call-script-builder";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";

const profile: ParentProfile = {
  id: "p1",
  owner_user_id: "u1",
  display_name: "아버지",
  relationship: "아버지",
  created_at: "2026-06-25T00:00:00Z",
  updated_at: "2026-06-25T00:00:00Z",
};

function makeCareTask(original_request: string): CareTaskSummary {
  return {
    id: "t1",
    parent_id: "p1",
    target_person: "아버지",
    original_request,
    status: "scheduled",
    priority: "normal",
    task_type: null,
    completed_at: null,
    notification_status: "none",
    created_at: "2026-06-25T00:00:00Z",
  };
}

describe("inferCallGoal", () => {
  it("약 관련 키워드가 있으면 medication_check를 반환한다", () => {
    expect(inferCallGoal("혈압약 드셨는지 확인해주세요")).toBe("medication_check");
  });

  it("식사 관련 키워드가 있으면 meal_check를 반환한다", () => {
    expect(inferCallGoal("오늘 식사 챙겨드셨는지 여쭤봐 주세요")).toBe("meal_check");
  });

  it("그 외에는 wellbeing_check를 반환한다", () => {
    expect(inferCallGoal("오늘 기분이 어떠신지 안부 전화 부탁드려요")).toBe("wellbeing_check");
  });
});

describe("buildCallScript / formatCallScriptText", () => {
  it("부모님 이름과 요청 내용을 본문에 포함한다", () => {
    const script = buildCallScript(profile, makeCareTask("혈압약 드실 시간이에요"));
    expect(script.call_goal).toBe("medication_check");
    expect(script.main_message).toContain("아버지님");
    expect(script.main_message).toContain("혈압약 드실 시간이에요");
  });

  it("formatCallScriptText는 세 문장을 하나의 텍스트로 합친다", () => {
    const script = buildCallScript(profile, makeCareTask("안부 전화 부탁드려요"));
    const text = formatCallScriptText(script);
    expect(text).toContain(script.opening);
    expect(text).toContain(script.main_message);
    expect(text).toContain(script.question);
  });
});
