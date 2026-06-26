import { describe, expect, it } from "vitest";
import { classifyTaskType } from "../task-type";

describe("classifyTaskType", () => {
  it("복약 키워드가 있으면 medication으로 분류한다", () => {
    expect(classifyTaskType("오늘 약 드셨는지 확인해 주세요")).toBe("medication");
  });

  it("식사 키워드가 있으면 meal으로 분류한다", () => {
    expect(classifyTaskType("오늘 점심 드셨는지 확인해 주세요")).toBe("meal");
  });

  it("수면 키워드가 있으면 sleep으로 분류한다", () => {
    expect(classifyTaskType("오늘 낮잠 잘 잤는지 확인해 주세요")).toBe("sleep");
  });

  it("병원 키워드가 있으면 hospital로 분류한다", () => {
    expect(classifyTaskType("오늘 병원 다녀오셨는지 여쭤봐 주세요")).toBe("hospital");
  });

  it("운동 키워드가 있으면 exercise로 분류한다", () => {
    expect(classifyTaskType("오늘 산책 다녀오셨는지 확인해 주세요")).toBe("exercise");
  });

  it("매칭되는 키워드가 없으면 general로 분류한다", () => {
    expect(classifyTaskType("오늘 기분이 어떠신지 여쭤봐 주세요")).toBe("general");
  });

  it("\"요약\" 안의 \"약\"을 복약으로 오매칭하지 않는다(Day12 버그 재발 방지)", () => {
    expect(classifyTaskType("최근 상태 요약해 주세요")).toBe("general");
  });
});
