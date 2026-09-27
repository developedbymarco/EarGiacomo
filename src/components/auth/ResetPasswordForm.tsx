"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/app/auth/actions";
import { AuthCard, Field, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, null);

  return (
    <AuthCard title="Choose a new password">
      <form action={action} className="space-y-4">
        <Field label="New password" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" />
        <FormNote state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
      </form>
    </AuthCard>
  );
}
