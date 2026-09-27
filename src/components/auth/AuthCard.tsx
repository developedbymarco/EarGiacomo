import type { ReactNode } from "react";

export function AuthCard({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-serif text-5xl text-cream">{title}</h1>
        {lede ? <p className="mt-3 text-lg text-parchment">{lede}</p> : null}
      </div>
      {children}
    </section>
  );
}

export const fieldClass =
  "mt-1 w-full rounded-xl border border-gold/30 bg-espresso px-3 py-3 text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-parchment" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        className={fieldClass}
      />
    </label>
  );
}

export function FormNote({ state }: { state: { error?: string; message?: string } | null }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p role="alert" className={state.error ? "text-cream" : "text-parchment"}>
      {state.error ?? state.message}
    </p>
  );
}
