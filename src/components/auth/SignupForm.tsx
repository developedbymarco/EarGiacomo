"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "@/app/auth/actions";
import { AuthCard, Field, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, null);

  return (
    <AuthCard title="Create an account" lede="Email and a username. Practice still works if you skip this.">
      <form action={action} className="space-y-4">
        <Field label="Display name" name="displayName" autoComplete="nickname" />
        <Field label="Username" name="username" autoComplete="username" />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" />
        <FormNote state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="text-parchment">
        <Link href="/login" className="text-gold underline-offset-4 hover:underline">
          Already have an account
        </Link>
      </p>
    </AuthCard>
  );
}
