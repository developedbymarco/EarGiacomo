import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { NavIcon, type NavIconName } from "@/components/shell/NavIcon";
import { RewardCard } from "@/components/shell/RewardSummary";
import { getAccountContext } from "@/lib/account/session";

const rooms: { href: string; title: string; text: string; icon: NavIconName }[] = [
  { href: "/exam", title: "Exam", text: "Ten questions from what you already know. The score waits until the end.", icon: "exam" },
  { href: "/friends", title: "Friends", text: "Search for a player, answer a request, or open a profile.", icon: "friends" },
  { href: "/battles", title: "Battles", text: "Challenge a friend. A match can be free, or played for Giacominos.", icon: "battles" },
];

export default async function MorePage() {
  const account = await getAccountContext();
  const signedIn = Boolean(account.user && account.profile);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-serif text-5xl text-cream">More</h1>
        <p className="mt-3 text-lg text-parchment">Exam, friends, and battles live here, off the main bar.</p>
      </div>
      {account.profile ? <RewardCard xp={account.profile.xp} giacominos={account.profile.giacominos} /> : null}
      <ul className="overflow-hidden rounded-3xl border border-gold/30 bg-plum/40">
        {!signedIn ? (
          <li className="border-b border-gold/20">
            <Row href="/login" title="Log in" text="Friends, battles, and your Giacominos stay with an account." icon="login" />
          </li>
        ) : null}
        {rooms.map((room) => (
          <li key={room.href} className="border-b border-gold/20">
            <Row href={room.href} title={room.title} text={room.text} icon={room.icon} />
          </li>
        ))}
        {signedIn ? (
          <li className="border-b border-gold/20">
            <Row href="/account" title="Account" text="Name, piano, range, and who can see you." icon="account" />
          </li>
        ) : null}
        {signedIn ? (
          <li>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-plum/70">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-espresso text-gold">
                  <NavIcon name="logout" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg text-cream">Log out</span>
                  <span className="mt-0.5 block text-sm text-parchment">Leave this account on this device.</span>
                </span>
              </button>
            </form>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function Row({ href, title, text, icon }: { href: string; title: string; text: string; icon: NavIconName }) {
  return (
    <Link href={href} className="flex items-center gap-4 px-4 py-4 hover:bg-plum/70">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-espresso text-gold">
        <NavIcon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg text-cream">{title}</span>
        <span className="mt-0.5 block text-sm text-parchment">{text}</span>
      </span>
      <span aria-hidden="true" className="text-xl text-gold">
        ›
      </span>
    </Link>
  );
}
