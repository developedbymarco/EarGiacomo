import { describe, expect, it } from "vitest";
import { accessTokenExpiry, authCookieValue, jwtPayload } from "@/lib/supabase/access-token";

function token(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "none" })).replaceAll("=", "");
  const body = btoa(JSON.stringify({ exp, sub: "user-1" })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${header}.${body}.sig`;
}

describe("auth cookie", () => {
  it("joins chunked auth cookies in order and ignores other cookies", () => {
    const value = authCookieValue([
      { name: "theme", value: "dark" },
      { name: "sb-ref-auth-token.1", value: "B" },
      { name: "sb-ref-auth-token.0", value: "A" },
    ]);
    expect(value).toBe("AB");
  });

  it("reads the session expiry without a network call", () => {
    const raw = `base64-${btoa(JSON.stringify({ access_token: token(1_800_000_000), expires_at: 1_800_000_000 }))}`;
    expect(accessTokenExpiry(raw)).toBe(1_800_000_000);
    expect(jwtPayload(token(1_800_000_000))?.sub).toBe("user-1");
  });

  it("returns null when the cookie is not a session", () => {
    expect(accessTokenExpiry("not-json")).toBeNull();
    expect(authCookieValue([])).toBeNull();
  });
});
