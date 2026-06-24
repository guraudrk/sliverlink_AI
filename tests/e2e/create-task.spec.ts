import { expect, test } from "@playwright/test";

test.describe("웹 입력 폼 (Dry Run)", () => {
  test("1. 페이지가 정상적으로 로드된다", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/SilverLink AI/);
    await expect(page.getByRole("heading", { name: "어르신께 마음을 전해보세요" })).toBeVisible();
    await expect(page.getByLabel("보내는 분")).toHaveValue("자녀 테스트");
    await expect(page.getByLabel("받는 분")).toBeVisible();
    await expect(page.getByLabel("전하실 말씀")).toBeVisible();
    await expect(page.getByRole("button", { name: "전달하기" })).toBeEnabled();
  });

  test("2. message를 입력하고 제출하면 성공 메시지가 보인다", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("전하실 말씀").fill("오늘 점심 맛있게 드셨는지 여쭤봐 주세요.");
    await page.getByRole("button", { name: "전달하기" }).click();

    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    await expect(status).toContainText(/처리됐어요|전달됐어요/);
  });

  test("3. 빈 message로 제출하면 오류 메시지가 보인다", async ({ page }) => {
    await page.goto("/");

    // message를 입력하지 않은 채로 바로 제출 -> 프론트 클라이언트 검증이 API 호출 전에 막아야 한다.
    await page.getByRole("button", { name: "전달하기" }).click();

    // Next.js의 내부 라우트 안내 요소도 role="alert"라서, 보이는 메시지로 좁혀서 찾는다.
    const alert = page.getByRole("alert").filter({ hasText: "전달할 말씀을 입력해 주세요" });
    await expect(alert).toBeVisible();
  });

  test("4. payload preview에 source_channel = web이 보인다", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("전하실 말씀").fill("오늘 점심 맛있게 드셨는지 여쭤봐 주세요.");
    await page.getByRole("button", { name: "전달하기" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    await expect(page.locator("pre")).toContainText('"source_channel": "web"');
  });

  test("5. payload preview에 target_person과 message가 보인다", async ({ page }) => {
    await page.goto("/");

    const message = "오늘 약 챙겨 드셨는지 여쭤봐 주세요.";
    await page.getByLabel("받는 분").selectOption("어머니 테스트");
    await page.getByLabel("전하실 말씀").fill(message);
    await page.getByRole("button", { name: "전달하기" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    const preview = page.locator("pre");
    await expect(preview).toContainText('"target_person": "어머니 테스트"');
    await expect(preview).toContainText(message);
  });
});
