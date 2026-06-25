import { describe, expect, it } from "vitest";
import { buildEvidence } from "../evidence-builder";
import type { RagEvidenceSourceRows } from "@/lib/supabase/rag-evidence-repo";

function emptyRows(): RagEvidenceSourceRows {
  return {
    parentProfiles: [],
    careTasks: [],
    messageLogs: [],
    notificationQueue: [],
    careCallAttempts: [],
    deliveryAttempts: [],
  };
}

describe("buildEvidence", () => {
  it("parent_profiles의 배경 정보를 하나의 evidence로 합친다", () => {
    const rows = emptyRows();
    rows.parentProfiles = [
      {
        id: "p1",
        display_name: "어머니",
        care_context: "무릎이 불편하심",
        daily_routine: null,
        medication_notes: "혈압약 매일 복용",
        communication_style: null,
      },
    ];
    const evidence = buildEvidence("open", rows);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].sourceType).toBe("parent_profile");
    expect(evidence[0].summary).toContain("무릎이 불편하심");
    expect(evidence[0].safetyFlags).toContain("medication_related");
  });

  it("help_requested 상태의 care_task는 importance가 high이고 help 분류에서 살아남는다", () => {
    const rows = emptyRows();
    rows.careTasks = [
      { id: "t1", parent_id: "p1", original_request: "도움이 필요해요", status: "help_requested", priority: "normal", created_at: "2026-06-25T00:00:00Z" },
      { id: "t2", parent_id: "p1", original_request: "별일 없음", status: "completed", priority: "normal", created_at: "2026-06-24T00:00:00Z" },
    ];
    const evidence = buildEvidence("help", rows);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].id).toBe("care_task:t1");
    expect(evidence[0].importance).toBe("high");
  });

  it("calls 분류는 care_call_attempt 출처만 남긴다", () => {
    const rows = emptyRows();
    rows.careTasks = [{ id: "t1", parent_id: "p1", original_request: "일정", status: "scheduled", priority: "normal", created_at: "2026-06-25T00:00:00Z" }];
    rows.careCallAttempts = [
      { id: "c1", parent_id: "p1", status: "completed", call_script: "안부 전화 스크립트", parent_response: "완료했어요", risk_level: "none", created_at: "2026-06-25T00:00:00Z" },
    ];
    const evidence = buildEvidence("calls", rows);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].sourceType).toBe("care_call_attempt");
  });

  it("매칭되는 근거가 없으면 빈 배열을 반환한다(환각 방지용 신호)", () => {
    const rows = emptyRows();
    rows.careTasks = [{ id: "t1", parent_id: "p1", original_request: "별일 없음", status: "completed", priority: "normal", created_at: "2026-06-25T00:00:00Z" }];
    const evidence = buildEvidence("help", rows);
    expect(evidence).toHaveLength(0);
  });

  it("importance 순서(high -> medium -> low)로 정렬한다", () => {
    const rows = emptyRows();
    rows.careTasks = [
      { id: "low", parent_id: "p1", original_request: "낮음", status: "scheduled", priority: "normal", created_at: "2026-06-25T00:00:00Z" },
      { id: "high", parent_id: "p1", original_request: "도움", status: "help_requested", priority: "normal", created_at: "2026-06-24T00:00:00Z" },
    ];
    const evidence = buildEvidence("summary", rows);
    expect(evidence[0].id).toBe("care_task:high");
    expect(evidence[1].id).toBe("care_task:low");
  });
});
