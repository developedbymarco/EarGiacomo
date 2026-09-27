"use client";

import { useActionState } from "react";
import { updatePrivacyAction } from "@/app/friends/actions";
import { fieldClass, FormNote } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export function PrivacyForm({
  profileVisibility,
  showAccuracy,
  allowChallenges,
  showBattleHistory,
}: {
  profileVisibility: "public" | "friends" | "private";
  showAccuracy: boolean;
  allowChallenges: boolean;
  showBattleHistory: boolean;
}) {
  const [state, action, pending] = useActionState(updatePrivacyAction, null);

  return (
    <form action={action} className="space-y-4 rounded-3xl border border-gold/30 bg-plum/40 p-5">
      <h2 className="font-serif text-3xl text-cream">Privacy</h2>
      <label className="block text-parchment" htmlFor="profileVisibility">
        Who can see your profile
        <select id="profileVisibility" name="profileVisibility" defaultValue={profileVisibility} className={fieldClass}>
          <option value="public">Anyone signed in</option>
          <option value="friends">Friends</option>
          <option value="private">Only you</option>
        </select>
      </label>
      <Check name="showAccuracy" label="Show accuracy to people who can see your profile" defaultChecked={showAccuracy} />
      <Check name="allowChallenges" label="Allow friend challenges" defaultChecked={allowChallenges} />
      <Check name="showBattleHistory" label="Show battle history" defaultChecked={showBattleHistory} />
      <p className="text-sm text-parchment/80">Challenges and battle history apply when battles are added.</p>
      <FormNote state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save privacy"}
      </Button>
    </form>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-3 text-parchment">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-gold" />
      <span>{label}</span>
    </label>
  );
}
