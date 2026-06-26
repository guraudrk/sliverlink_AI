import { describe, expect, it } from "vitest";
import { buildFallbackAnswer, containsForbiddenPhrase } from "../answer-generator";
import type { RagEvidence } from "../types";

function makeEvidence(overrides: Partial<RagEvidence> = {}): RagEvidence {
  return {
    id: "care_task:t1",
    sourceType: "care_task",
    parentId: "p1",
    title: "일정 - 도움 요청",
    summary: "도움이 필요해요",
    rawText: "도움이 필요해요",
    createdAt: "2026-06-25T00:00:00Z",
    importance: "low",
    safetyFlags: [],
    ...overrides,
  };
}

describe("buildFallbackAnswer", () => {
  it("근거가 없으면 안내 문구만 반환하고 hasSufficientEvidence는 false다", () => {
    const answer = buildFallbackAnswer("open", []);
    expect(answer.hasSufficientEvidence).toBe(false);
    expect(answer.evidence).toHaveLength(0);
    expect(answer.answerText).toContain("찾지 못했어요");
  });

  it("근거가 있으면 건수와 제목/요약을 답변에 포함한다", () => {
    const evidence = [makeEvidence(), makeEvidence({ id: "care_task:t2", safetyFlags: [] })];
    const answer = buildFallbackAnswer("summary", evidence);
    expect(answer.hasSufficientEvidence).toBe(true);
    expect(answer.answerText).toContain("2건");
    expect(answer.answerText).toContain("도움이 필요해요");
  });

  it("help_requested 태그가 있으면 직접 연락 권장 문구와 다음 행동을 추가한다", () => {
    const evidence = [makeEvidence({ safetyFlags: ["help_requested"] })];
    const answer = buildFallbackAnswer("help", evidence);
    expect(answer.answerText).toContain("직접 연락해 확인");
    expect(answer.nextSteps).toContain("도움 요청한 항목 직접 확인하기");
  });

  it("medication 카테고리이고 medication_related 태그가 있으면 복약 메모 확인을 다음 행동으로 추가한다", () => {
    const evidence = [makeEvidence({ sourceType: "parent_profile", safetyFlags: ["medication_related"] })];
    const answer = buildFallbackAnswer("medication", evidence);
    expect(answer.nextSteps).toContain("복약 메모를 다시 확인하기");
  });

  it("evidence가 5건을 넘으면 답변에는 상위 5건만 담는다", () => {
    const evidence = Array.from({ length: 7 }, (_, i) => makeEvidence({ id: `care_task:t${i}` }));
    const answer = buildFallbackAnswer("summary", evidence);
    expect(answer.evidence).toHaveLength(5);
    expect(answer.answerText).toContain("7건");
  });
});

describe("containsForbiddenPhrase", () => {
  it("진단/안전 단언 표현이 포함되면 true다", () => {
    expect(containsForbiddenPhrase("어머니는 치매입니다.")).toBe(true);
    expect(containsForbiddenPhrase("지금은 병원에 안 가도 됩니다.")).toBe(true);
  });

  it("금지 표현이 없으면 false다", () => {
    expect(containsForbiddenPhrase("오늘은 약을 잘 챙겨 드셨다고 하셨어요.")).toBe(false);
  });
});
