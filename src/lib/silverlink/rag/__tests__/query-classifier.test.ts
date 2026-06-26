import { describe, expect, it } from "vitest";
import { classifyQuery } from "../query-classifier";

describe("classifyQuery", () => {
  it("도움 키워드가 있으면 help로 분류한다", () => {
    expect(classifyQuery("도움 요청이 있었던 일정만 보여줘")).toBe("help");
  });

  it("복약 관련 키워드가 있으면 medication으로 분류한다", () => {
    expect(classifyQuery("복약 관련 기록 정리해줘")).toBe("medication");
  });

  it("전화 관련 키워드가 있으면 calls로 분류한다", () => {
    expect(classifyQuery("안부전화 결과 요약해줘")).toBe("calls");
  });

  it("요약/상태/최근 키워드만 있으면 summary로 분류한다", () => {
    expect(classifyQuery("최근 상태 요약해줘")).toBe("summary");
  });

  it("매칭되는 키워드가 없으면 open으로 분류한다", () => {
    expect(classifyQuery("오늘 날씨 어때?")).toBe("open");
  });

  it("새 일정 등록 명령 키워드가 있으면 task_request로 분류한다", () => {
    expect(classifyQuery("엄마 일정 새로 만들어줘")).toBe("task_request");
  });

  it("명령 안에 다른 카테고리 키워드(병원 등)가 섞여 있어도 명령 자체를 우선해 task_request로 분류한다", () => {
    expect(classifyQuery("병원 다녀오셨는지 확인하는 일정 만들어줘")).toBe("task_request");
  });
});
