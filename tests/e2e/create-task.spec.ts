import { expect, test } from "@playwright/test";

// Day6+7부터 입력 폼이 "/dashboard/create-task"(로그인 + 등록된 parent_profiles 필요)로 이동했다.
// 로그인 세션이 필요한 happy path(부모님 선택 → 제출 → payload 확인)는 실제 확인된 테스트 계정이
// 있어야 검증 가능해서, 이 슬라이스에서는 비로그인 가드만 자동화하고 나머지는 로그인 계정이
// 준비되면 이어서 추가한다 (work-log.md Day6+7 Slice 5 참고).
test.describe("웹 입력 폼 (Day6+7, /dashboard/create-task)", () => {
  test("비로그인 상태로 접근하면 /login으로 리다이렉트된다", async ({ page }) => {
    await page.goto("/dashboard/create-task");
    await expect(page).toHaveURL(/\/login$/);
  });
});
