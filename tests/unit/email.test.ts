import { describe, expect, it } from "vitest";

import {
  isEmailAllowed,
  normalizeEmail,
  parseAllowedEmails,
} from "@/lib/utils";

describe("normalizeEmail", () => {
  it("trims and lowercases email", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("parseAllowedEmails", () => {
  it("parses comma-separated emails", () => {
    expect(parseAllowedEmails("a@x.com, B@Y.com , ,c@z.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseAllowedEmails("")).toEqual([]);
    expect(parseAllowedEmails("  ,  ")).toEqual([]);
  });
});

describe("isEmailAllowed", () => {
  it("matches normalized email against allowed list", () => {
    const allowed = ["user@example.com", "admin@test.com"];
    expect(isEmailAllowed("User@Example.COM", allowed)).toBe(true);
    expect(isEmailAllowed("other@test.com", allowed)).toBe(false);
  });
});
