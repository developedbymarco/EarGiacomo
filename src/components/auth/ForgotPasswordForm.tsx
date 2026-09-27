"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/auth/actions";
import { AuthCard, Field, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);

  return (
    <AuthCard title="Reset password" lede="We will email a link if this address has an account.">
      <form action={action} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <FormNote state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p>
        <Link href="/login" className="text-gold underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
