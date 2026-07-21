import { test, expect } from "@playwright/test";

test("forgot password page loads", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
});
