import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accessTokenExpiry, authCookieValue } from "@/lib/supabase/access-token";

const REFRESH_WITHIN_SECONDS = 120;

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();
  if (sessionIsFresh(request)) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
}

function sessionIsFresh(request: NextRequest): boolean {
  const raw = authCookieValue(request.cookies.getAll());
  if (!raw) return true;
  const expiry = accessTokenExpiry(raw);
  if (expiry === null) return false;
  return expiry > Math.floor(Date.now() / 1000) + REFRESH_WITHIN_SECONDS;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|samples/).*)"],
};
