"use client";

import { useActionState } from "react";
import { unlockLessonAction } from "@/app/path/actions";
import { Button } from "@/components/ui/button";

export function UnlockLessonButton({
  slug,
  cost,
  balance,
  quiet = false,
}: {
  slug: string;
  cost: number;
  balance: number;
  quiet?: boolean;
}) {
  const [state, action, pending] = useActionState(unlockLessonAction, null);
  const short = balance < cost;

  return (
    <form action={action} className={quiet ? "space-y-2" : "space-y-3"}>
      <input type="hidden" name="slug" value={slug} />
      {quiet ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-cream/70">
          <CostBadge cost={cost} />
          <span>You have {balance}.</span>
        </p>
      ) : (
        <p className="text-parchment">
          Unlock for {cost} Giacominos. You have {balance}.
        </p>
      )}
      {state?.error ? (
        <p role="alert" className="text-cream">
          {state.error}
        </p>
      ) : null}
      {state?.message ? <p className="text-parchment">{state.message}</p> : null}
      <Button type="submit" variant={quiet ? "ghost" : "gold"} disabled={pending || short}>
        {pending ? "Unlocking…" : "Unlock"}
      </Button>
    </form>
  );
}

function CostBadge({ cost }: { cost: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/70 px-2.5 py-1 font-semibold text-gold">
      <span className="size-3 rounded-full bg-gold" aria-hidden="true" />
      {cost}
    </span>
  );
}
