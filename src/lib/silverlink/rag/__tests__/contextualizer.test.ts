import { describe, expect, it } from "vitest";
import { buildContextualText } from "../contextualizer";
import type { RagEvidence } from "../types";

function makeEvidence(overrides: Partial<RagEvidence> = {}): RagEvidence {
  return {
    id: "care_task:t1",
    sourceType: "care_task",
    parentId: "p1",
    title: "복약 확인",
    summary: "약 드셨는지 확인",
    rawText: "완료했어요",
    createdAt: "2026-06-25T09:00:00Z",
    importance: "medium",
    safetyFlags: [],
    ...overrides,
  };
}

describe("buildContextualText", () => {
  it("출처 타입에 맞는 한글 라벨과 날짜, 제목/내용을 모두 포함한다", () => {
    const text = buildContextualText(makeEvidence());
    expect(text).toContain("일정 기록");
    expect(text).toContain("2026-06-25 작성");
    expect(text).toContain("복약 확인");
    expect(text).toContain("완료했어요");
  });

  it("출처 타입별로 라벨이 다르게 붙는다", () => {
    expect(buildContextualText(makeEvidence({ sourceType: "care_call_attempt" }))).toContain("안부전화 기록");
    expect(buildContextualText(makeEvidence({ sourceType: "message_log" }))).toContain("메시지 기록");
  });

  it("parent_profile처럼 시점이 없는 배경 정보는 epoch 날짜 대신 '상시 배경 정보'로 표시한다", () => {
    const text = buildContextualText(
      makeEvidence({ sourceType: "parent_profile", createdAt: new Date(0).toISOString() })
    );
    expect(text).toContain("상시 배경 정보");
    expect(text).not.toContain("1970");
  });

  it("원문(rawText)을 그대로 보존한다 — 맥락 문장이 원문을 바꾸지 않는다", () => {
    const text = buildContextualText(makeEvidence({ rawText: "오늘은 괜찮은데 좀 피곤하다고 하셨어요" }));
    expect(text).toContain("오늘은 괜찮은데 좀 피곤하다고 하셨어요");
  });
});
