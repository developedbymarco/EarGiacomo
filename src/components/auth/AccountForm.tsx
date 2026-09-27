"use client";

import { useActionState } from "react";
import { deleteAccountAction, updateProfileAction } from "@/app/auth/actions";
import { fieldClass, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { midiToNoteName, SELECTABLE_NOTES } from "@/lib/music-theory/notes";

export function AccountForm({
  email,
  username,
  displayName,
  rangeLow,
  rangeHigh,
}: {
  email: string;
  username: string;
  displayName: string;
  rangeLow: number;
  rangeHigh: number;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [deleteState, deleteAction, deleting] = useActionState(deleteAccountAction, null);

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <div>
        <h1 className="font-serif text-5xl text-cream">Account</h1>
        <p className="mt-3 text-lg text-parchment">Signed in as {email}</p>
      </div>

      <form action={action} className="space-y-4">
        <label className="block text-parchment" htmlFor="displayName">
          Display name
          <input id="displayName" name="displayName" defaultValue={displayName} required className={fieldClass} />
        </label>
        <label className="block text-parchment" htmlFor="username">
          Username
          <input id="username" name="username" defaultValue={username} required autoComplete="username" className={fieldClass} />
        </label>
        <p className="text-parchment">The piano character is chosen on the practice page.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NoteSelect label="Lowest note" name="rangeLow" value={rangeLow} />
          <NoteSelect label="Highest note" name="rangeHigh" value={rangeHigh} />
        </div>
        <p className="text-sm text-parchment/80">Practice uses this range while you are logged in.</p>
        <FormNote state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save account"}
        </Button>
      </form>

      <section className="space-y-4 rounded-3xl border border-burgundy p-5">
        <h2 className="font-serif text-3xl text-cream">Delete account</h2>
        <p className="text-parchment">This removes your login and profile. Practice settings stored in this browser stay here.</p>
        <form action={deleteAction} className="space-y-4">
          <label className="block text-parchment" htmlFor="confirm">
            Type DELETE to confirm
            <input id="confirm" name="confirm" autoComplete="off" className={fieldClass} />
          </label>
          <FormNote state={deleteState} />
          <Button type="submit" variant="ghost" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </form>
      </section>
    </div>
  );
}

function NoteSelect({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="block text-parchment" htmlFor={name}>
      {label}
      <select id={name} name={name} defaultValue={value} className={fieldClass}>
        {SELECTABLE_NOTES.map((midi) => (
          <option key={midi} value={midi}>
            {midiToNoteName(midi)}
          </option>
        ))}
      </select>
    </label>
  );
}
