import { describe, expect, it } from "vitest";
import { checkEvidenceQuality, DEFAULT_RELEVANCE_THRESHOLD } from "../crag-check";

describe("checkEvidenceQuality", () => {
  it("근거가 0건이면 false다", () => {
    expect(checkEvidenceQuality([])).toBe(false);
  });

  it("최고 유사도가 임계값 이상이면 true다", () => {
    const evidence = [{ similarity: 0.8 }, { similarity: 0.3 }];
    expect(checkEvidenceQuality(evidence)).toBe(true);
  });

  it("최고 유사도가 임계값 미달이면 false다", () => {
    const evidence = [{ similarity: 0.2 }, { similarity: 0.1 }];
    expect(checkEvidenceQuality(evidence)).toBe(false);
  });

  it("정렬 순서와 무관하게 가장 높은 유사도를 기준으로 판단한다", () => {
    const evidence = [{ similarity: 0.1 }, { similarity: 0.9 }, { similarity: 0.2 }];
    expect(checkEvidenceQuality(evidence)).toBe(true);
  });

  it("similarity가 없는 항목(키워드 검색 결과)은 0으로 취급한다", () => {
    const evidence = [{}, {}];
    expect(checkEvidenceQuality(evidence)).toBe(false);
  });

  it("threshold를 직접 지정할 수 있다", () => {
    const evidence = [{ similarity: 0.6 }];
    expect(checkEvidenceQuality(evidence, 0.7)).toBe(false);
    expect(checkEvidenceQuality(evidence, 0.5)).toBe(true);
  });

  it("기본 임계값은 0.5다", () => {
    expect(DEFAULT_RELEVANCE_THRESHOLD).toBe(0.5);
  });
});
