import { describe, expect, it } from "vitest";
import { buildHistoryAwareSearchText, formatHistoryTranscript } from "../conversation-history";

describe("formatHistoryTranscript", () => {
  it("히스토리가 없으면 빈 문자열을 반환한다", () => {
    expect(formatHistoryTranscript(undefined)).toBe("");
    expect(formatHistoryTranscript([])).toBe("");
  });

  it("user/assistant 라벨을 붙여 대화록을 만든다", () => {
    const transcript = formatHistoryTranscript([
      { role: "user", text: "최근 상태 어때?" },
      { role: "assistant", text: "최근에 도움 요청이 1건 있었어요." },
    ]);
    expect(transcript).toContain("자녀: 최근 상태 어때?");
    expect(transcript).toContain("AI 비서: 최근에 도움 요청이 1건 있었어요.");
  });

  it("최근 6턴만 남기고 그 이전은 자른다", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: "user" as const, text: `질문${i}` }));
    const transcript = formatHistoryTranscript(history);
    expect(transcript).not.toContain("질문0");
    expect(transcript).toContain("질문9");
  });
});

describe("buildHistoryAwareSearchText", () => {
  it("히스토리가 없으면 현재 질문만 그대로 반환한다", () => {
    expect(buildHistoryAwareSearchText("그 중에 도움 필요한 거 있어?", undefined)).toBe("그 중에 도움 필요한 거 있어?");
  });

  it("최근 자녀 질문을 현재 질문 앞에 붙인다", () => {
    const history = [
      { role: "user" as const, text: "최근 상태 요약해줘" },
      { role: "assistant" as const, text: "최근 기록 3건을 확인했어요." },
    ];
    const result = buildHistoryAwareSearchText("그 중에 도움 필요한 거 있어?", history);
    expect(result).toBe("최근 상태 요약해줘 그 중에 도움 필요한 거 있어?");
  });

  it("assistant 메시지는 검색어 합성에 포함하지 않는다", () => {
    const history = [{ role: "assistant" as const, text: "이전 답변 내용" }];
    const result = buildHistoryAwareSearchText("질문", history);
    expect(result).toBe("질문");
  });
});
