import { describe, expect, it } from "vitest";
import { fuseResults } from "../hybrid-search";

describe("fuseResults", () => {
  it("두 리스트에 모두 등장하는 항목이 한쪽에만 있는 항목보다 위로 올라온다", () => {
    const vectorResults = [
      { id: "a", item: "A" },
      { id: "b", item: "B" },
    ];
    const keywordResults = [
      { id: "b", item: "B" },
      { id: "c", item: "C" },
    ];

    const fused = fuseResults(vectorResults, keywordResults);

    expect(fused[0]).toBe("B");
    expect(fused).toHaveLength(3);
  });

  it("한쪽 리스트에만 있는 항목도 결과에서 빠지지 않는다", () => {
    const vectorResults = [{ id: "a", item: "A" }];
    const keywordResults = [{ id: "c", item: "C" }];

    const fused = fuseResults(vectorResults, keywordResults);

    expect(fused).toContain("A");
    expect(fused).toContain("C");
  });

  it("순위가 높을수록(앞에 있을수록) 더 높은 점수를 받아 결과 상위에 온다", () => {
    const vectorResults = [
      { id: "top", item: "top" },
      { id: "mid", item: "mid" },
      { id: "low", item: "low" },
    ];

    const fused = fuseResults(vectorResults, []);

    expect(fused).toEqual(["top", "mid", "low"]);
  });

  it("리스트가 비어 있으면 빈 배열을 반환한다", () => {
    expect(fuseResults([], [])).toEqual([]);
  });

  it("세 개 이상의 결과 리스트도 합칠 수 있다", () => {
    const list1 = [{ id: "x", item: "X" }];
    const list2 = [{ id: "x", item: "X" }];
    const list3 = [{ id: "y", item: "Y" }];

    const fused = fuseResults(list1, list2, list3);

    expect(fused[0]).toBe("X");
    expect(fused).toContain("Y");
  });
});
