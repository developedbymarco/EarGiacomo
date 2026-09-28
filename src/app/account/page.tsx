import { redirect } from "next/navigation";
import { AccountForm } from "@/components/auth/AccountForm";
import { PrivacyForm } from "@/components/friends/PrivacyForm";
import { SetupNotice } from "@/components/auth/SetupNotice";
import { getAccountContext } from "@/lib/account/session";
import { levelForXp, xpToReachLevel } from "@/lib/economy/rewards";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const account = await getAccountContext();
  if (!account.configured) return <SetupNotice />;
  if (!account.user) redirect("/login");
  if (!account.profile) {
    return (
      <section className="mx-auto max-w-xl space-y-4">
        <h1 className="font-serif text-5xl text-cream">Account</h1>
        <p className="text-lg text-parchment">
          {account.profileIssue === "unmigrated"
            ? "The profiles table is not in this Supabase project yet. Run the migration, then reload."
            : "This login has no profile yet. Create the account again after the migration is applied."}
        </p>
      </section>
    );
  }

  const showOnLeaderboard = await leaderboardChoice(account.user.id);
  const level = levelForXp(account.profile.xp);
  const intoLevel = account.profile.xp - xpToReachLevel(level);
  const span = xpToReachLevel(level + 1) - xpToReachLevel(level);

  return (
    <div className="space-y-8">
      <p className="text-lg text-parchment">
        Level {level}. {intoLevel} of {span} XP toward level {level + 1}. {account.profile.giacominos} Giacominos.
      </p>
      <AccountForm
        email={account.user.email}
        username={account.profile.username}
        displayName={account.profile.display_name ?? ""}
        rangeLow={account.profile.default_range_low ?? 48}
        rangeHigh={account.profile.default_range_high ?? 72}
        noteNames={account.profile.note_names}
      />
      {account.friendsReady ? (
        <div className="mx-auto max-w-xl">
          <PrivacyForm
            profileVisibility={account.profile.profile_visibility}
            showAccuracy={account.profile.show_accuracy}
            allowChallenges={account.profile.allow_challenges}
            showBattleHistory={account.profile.show_battle_history}
            showOnLeaderboard={showOnLeaderboard}
          />
        </div>
      ) : null}
    </div>
  );
}

async function leaderboardChoice(userId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("show_on_leaderboard").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data.show_on_leaderboard !== false;
}
