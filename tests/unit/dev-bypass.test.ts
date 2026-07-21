import { describe, expect, it } from "vitest";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

describe("isDevAuthBypassEnabled", () => {
  it("is false by default", () => {
    expect(
      isDevAuthBypassEnabled({
        nodeEnv: "development",
        appUrl: "http://localhost:3000",
        flag: undefined,
      }),
    ).toBe(false);
  });

  it("is true only for local development with the flag", () => {
    expect(
      isDevAuthBypassEnabled({
        nodeEnv: "development",
        vercelEnv: "development",
        appUrl: "http://localhost:3000",
        flag: "true",
      }),
    ).toBe(true);
  });

  it("stays false in production even if the flag is set", () => {
    expect(
      isDevAuthBypassEnabled({
        nodeEnv: "production",
        appUrl: "http://localhost:3000",
        flag: "true",
      }),
    ).toBe(false);
  });

  it("stays false for non-local APP_URL", () => {
    expect(
      isDevAuthBypassEnabled({
        nodeEnv: "development",
        appUrl: "https://mealplan.example.com",
        flag: "true",
      }),
    ).toBe(false);
  });
});
