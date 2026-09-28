export interface NamedCookie {
  name: string;
  value: string;
}

export function authCookieValue(cookies: NamedCookie[]): string | null {
  const auth = cookies.filter((cookie) => cookie.name.includes("-auth-token"));
  if (auth.length === 0) return null;
  const chunks = auth.filter((cookie) => /\.\d+$/.test(cookie.name));
  const source = (chunks.length > 0 ? chunks : auth).sort((left, right) => left.name.localeCompare(right.name));
  return source.map((cookie) => cookie.value).join("");
}

export function accessTokenExpiry(rawCookie: string): number | null {
  const session = sessionJson(rawCookie);
  if (!session || typeof session !== "object") return null;
  const record = session as { expires_at?: unknown; access_token?: unknown };
  if (typeof record.expires_at === "number") return record.expires_at;
  if (typeof record.access_token !== "string") return null;
  const payload = jwtPayload(record.access_token);
  return payload && typeof payload.exp === "number" ? payload.exp : null;
}

export function jwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(segment));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function sessionJson(rawCookie: string): unknown {
  let raw = rawCookie;
  if (raw.startsWith("base64-")) raw = decodeBase64Url(raw.slice("base64-".length));
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}
