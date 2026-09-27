"use client";

import { useActionState } from "react";
import { unlockLessonAction } from "@/app/path/actions";
import { Button } from "@/components/ui/button";

export function UnlockLessonButton({ slug, cost, balance }: { slug: string; cost: number; balance: number }) {
  const [state, action, pending] = useActionState(unlockLessonAction, null);
  const short = balance < cost;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-parchment">
        Unlock for {cost} Giacominos. You have {balance}.
      </p>
      {state?.error ? (
        <p role="alert" className="text-cream">
          {state.error}
        </p>
      ) : null}
      {state?.message ? <p className="text-parchment">{state.message}</p> : null}
      <Button type="submit" disabled={pending || short}>
        {pending ? "Unlocking…" : "Unlock"}
      </Button>
    </form>
  );
}
