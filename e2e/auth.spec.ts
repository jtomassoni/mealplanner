import { test, expect } from "@playwright/test";

test("login page renders and has no signup", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByText(/no public signup/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
});

test("unapproved email is rejected client-side by allowlist messaging", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("stranger@example.com");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(
    page.getByText(/this email is not authorized/i),
  ).toBeVisible();
});
