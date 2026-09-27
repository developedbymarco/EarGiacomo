"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowser() {
  const env = supabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}
