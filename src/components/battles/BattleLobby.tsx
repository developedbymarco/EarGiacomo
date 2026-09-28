"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { pulseBattle } from "@/app/battles/actions";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function BattleLobby({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let left = false;
    function enterMatch() {
      if (stopped || left) return;
      left = true;
      router.refresh();
    }

    const timer = setInterval(() => {
      void pulseBattle(id).then((pulse) => {
        if (pulse && pulse.status !== "pending") enterMatch();
      });
    }, 3000);

    const supabase = createSupabaseBrowser();
    const channel = supabase
      ?.channel(`battle-lobby:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "battles", filter: `id=eq.${id}` }, enterMatch)
      .subscribe();

    return () => {
      stopped = true;
      clearInterval(timer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [id, router]);

  return null;
}
