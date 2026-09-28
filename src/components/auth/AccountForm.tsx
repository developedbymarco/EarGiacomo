"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction, updateProfileAction } from "@/app/auth/actions";
import { fieldClass, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { nameNotes, type NoteNaming } from "@/lib/music-theory/naming";
import { midiToNoteName, SELECTABLE_NOTES } from "@/lib/music-theory/notes";

export function AccountForm({
  email,
  username,
  displayName,
  rangeLow,
  rangeHigh,
  noteNames,
}: {
  email: string;
  username: string;
  displayName: string;
  rangeLow: number;
  rangeHigh: number;
  noteNames: NoteNaming;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [deleteState, deleteAction, deleting] = useActionState(deleteAccountAction, null);
  const [naming, setNaming] = useState(noteNames);
  const [savedNaming, setSavedNaming] = useState(noteNames);
  if (noteNames !== savedNaming) {
    setSavedNaming(noteNames);
    setNaming(noteNames);
  }

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
        <fieldset className="space-y-2">
          <legend className="text-parchment">Note names</legend>
          <NamingChoice value="letters" current={naming} onChange={setNaming} label="A B C" />
          <NamingChoice value="solfege" current={naming} onChange={setNaming} label="Do Re Mi" />
          <p className="text-sm text-parchment/80">C is Do, D is Re, and B is Si. Sharps and flats stay with the syllable.</p>
        </fieldset>
        <p className="text-parchment">The piano character is chosen on the practice page.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NoteSelect label="Lowest note" name="rangeLow" value={rangeLow} naming={naming} />
          <NoteSelect label="Highest note" name="rangeHigh" value={rangeHigh} naming={naming} />
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

function NamingChoice({
  value,
  current,
  onChange,
  label,
}: {
  value: NoteNaming;
  current: NoteNaming;
  onChange: (value: NoteNaming) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-parchment">
      <input
        key={`${value}-${current}`}
        type="radio"
        name="noteNames"
        value={value}
        defaultChecked={current === value}
        onChange={() => onChange(value)}
        className="size-4 accent-gold"
      />
      {label}
    </label>
  );
}

function NoteSelect({ label, name, value, naming }: { label: string; name: string; value: number; naming: NoteNaming }) {
  return (
    <label className="block text-parchment" htmlFor={name}>
      {label}
      <select id={name} name={name} defaultValue={value} className={fieldClass}>
        {SELECTABLE_NOTES.map((midi) => (
          <option key={midi} value={midi}>
            {nameNotes(midiToNoteName(midi), naming)}
          </option>
        ))}
      </select>
    </label>
  );
}
