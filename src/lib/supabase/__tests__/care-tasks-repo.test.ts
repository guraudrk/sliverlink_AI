import { describe, expect, it } from "vitest";
import { isOwnParentProfile } from "../care-tasks-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeStubClient(maybeSingleResult: { data: unknown; error: unknown }): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => maybeSingleResult,
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("isOwnParentProfile", () => {
  it("RLS를 통과해 행이 보이면(=내 소유) true를 반환한다", async () => {
    const supabase = makeStubClient({ data: { id: "p1" }, error: null });
    expect(await isOwnParentProfile(supabase, "p1")).toBe(true);
  });

  it("RLS에 걸려 0건이면(남의 프로필이거나 존재하지 않음) false를 반환한다", async () => {
    const supabase = makeStubClient({ data: null, error: null });
    expect(await isOwnParentProfile(supabase, "other-id")).toBe(false);
  });

  it("쿼리 자체가 에러면 throw한다", async () => {
    const supabase = makeStubClient({ data: null, error: new Error("boom") });
    await expect(isOwnParentProfile(supabase, "p1")).rejects.toThrow();
  });
});
