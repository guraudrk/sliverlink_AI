import { describe, expect, it } from "vitest";
import { looksLikeTaskCreationClarification } from "../assistant-response";

describe("looksLikeTaskCreationClarification", () => {
  it("새 일정 등록 되묻기 템플릿 문구가 있으면 true를 반환한다", () => {
    const text = "새 일정을 등록하려면 아래 내용을 알려주세요.\n1. 보내는 분: (이름)\n2. 전하실 말씀: (구체적인 요청 내용)";
    expect(looksLikeTaskCreationClarification(text)).toBe(true);
  });

  it("질문에 답하는 일반 텍스트면(템플릿 문구 없음) false를 반환한다", () => {
    expect(looksLikeTaskCreationClarification("최근 복약 기록은 모두 정상적으로 확인됐어요.")).toBe(false);
  });

  it("두 문구 중 하나만 있으면 false를 반환한다(둘 다 있어야 새 일정 등록 흐름으로 본다)", () => {
    expect(looksLikeTaskCreationClarification("보내는 분이 누구신가요?")).toBe(false);
    expect(looksLikeTaskCreationClarification("전하실 말씀이 구체적으로 어떤 건가요?")).toBe(false);
  });
});
