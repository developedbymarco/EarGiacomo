import { describe, expect, it } from "vitest";
import { authErrorMessage, firstIssue, profileFormSchema, signupSchema, usernameSchema } from "@/lib/account/profile";

describe("account profile", () => {
  it("accepts a lowercase username", () => {
    expect(usernameSchema.parse("Ear_Giacomo")).toBe("ear_giacomo");
  });

  it("rejects usernames that are too short or decorated", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("bad name").success).toBe(false);
    expect(usernameSchema.safeParse("no-hyphen").success).toBe(false);
  });

  it("requires the pitch range to rise", () => {
    const result = profileFormSchema.safeParse({
      username: "marco",
      displayName: "Marco",
      rangeLow: 72,
      rangeHigh: 48,
      noteNames: "letters",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toMatch(/highest note/i);
  });

  it("requires matching passwords", () => {
    const result = signupSchema.safeParse({
      email: "marco@example.com",
      password: "practice1",
      confirm: "practice2",
      username: "marco",
      displayName: "Marco",
    });
    expect(result.success).toBe(false);
  });

  it("maps duplicate usernames to a plain sentence", () => {
    expect(authErrorMessage({ message: "duplicate key value", code: "23505" })).toBe("That username is taken.");
    expect(authErrorMessage({ message: "Invalid login credentials" })).toBe("Email or password is incorrect.");
  });
});
