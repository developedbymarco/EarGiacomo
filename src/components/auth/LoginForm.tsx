"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/auth/actions";
import { AuthCard, Field, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export function LoginForm({ confirmError }: { confirmError: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <AuthCard title="Log in" lede="Your pitch range and piano stay with this account.">
      <form action={action} className="space-y-4">
        {confirmError ? (
          <p role="alert" className="text-cream">
            That confirmation link did not work. Request a new one from the reset page, or log in if you already confirmed.
          </p>
        ) : null}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <FormNote state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-parchment">
        <Link href="/forgot-password" className="text-gold underline-offset-4 hover:underline">
          Forgot password
        </Link>
        <span className="mx-2">·</span>
        <Link href="/signup" className="text-gold underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
