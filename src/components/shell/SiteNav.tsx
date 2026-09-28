"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { NavIcon, type NavIconName } from "@/components/shell/NavIcon";
import { RewardCard, RewardSummary } from "@/components/shell/RewardSummary";

const tabs: { href: string; label: string; icon: NavIconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/path", label: "Path", icon: "path" },
  { href: "/practice", label: "Practice", icon: "practice" },
  { href: "/leaderboard", label: "Board", icon: "board" },
];

const train: { href: string; label: string; icon: NavIconName }[] = [
  ...tabs.slice(0, 3),
  { href: "/exam", label: "Exam", icon: "exam" },
];

const people: { href: string; label: string; icon: NavIconName }[] = [
  tabs[3]!,
  { href: "/friends", label: "Friends", icon: "friends" },
  { href: "/battles", label: "Battles", icon: "battles" },
];

const moreHrefs = ["/more", "/exam", "/friends", "/battles", "/account", "/login", "/signup", "/forgot-password"];

export function SideBar({
  signedIn,
  xp,
  giacominos,
}: {
  signedIn: boolean;
  xp: number | null;
  giacominos: number | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-full flex-col border-r border-gold/25 bg-espresso/80 px-3 py-6 lg:flex">
      <Link href="/" className="px-3 font-serif text-3xl tracking-wide text-cream">
        EarGiacomo
      </Link>
      {signedIn && xp != null && giacominos != null ? (
        <div className="mt-5">
          <RewardCard xp={xp} giacominos={giacominos} />
        </div>
      ) : null}
      <nav className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Main">
        <NavGroup label="Train" pathname={pathname} items={train} />
        <NavGroup label="People" pathname={pathname} items={people} />
      </nav>
      <div className="mt-4 border-t border-gold/20 pt-3">
        {signedIn ? (
          <>
            <SidebarLink href="/account" label="Account" icon="account" active={isActive(pathname, "/account")} />
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-parchment hover:bg-plum hover:text-cream">
                <NavIcon name="logout" className="size-5" />
                Log out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold text-espresso bg-gold">
            <NavIcon name="login" className="size-5" />
            Log in
          </Link>
        )}
      </div>
    </aside>
  );
}

export function TabBar() {
  const pathname = usePathname();
  if (isFocused(pathname)) return null;
  const moreActive = moreHrefs.some((href) => isActive(pathname, href));
  return (
    <>
      <div className="h-[calc(4.25rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-espresso/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Main"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <TabLink href={tab.href} label={tab.label} icon={tab.icon} active={isActive(pathname, tab.href)} />
            </li>
          ))}
          <li>
            <TabLink href="/more" label="More" icon="more" active={moreActive} />
          </li>
        </ul>
      </nav>
    </>
  );
}

export function MobileHeader({
  signedIn,
  xp,
  giacominos,
}: {
  signedIn: boolean;
  xp: number | null;
  giacominos: number | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gold/25 bg-espresso/90 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-serif text-3xl tracking-wide text-cream">
          EarGiacomo
        </Link>
        {signedIn && xp != null && giacominos != null ? (
          <RewardSummary xp={xp} giacominos={giacominos} layout="badge" />
        ) : (
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-espresso">
            <NavIcon name="login" className="size-4" />
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { href: string; label: string; icon: NavIconName }[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 text-xs font-semibold tracking-[0.16em] text-parchment/60 uppercase">{label}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <SidebarLink href={item.href} label={item.label} icon={item.icon} active={isActive(pathname, item.href)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarLink({ href, label, icon, active }: { href: string; label: string; icon: NavIconName; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${active ? "bg-plum text-cream" : "text-parchment hover:bg-plum/60 hover:text-cream"}`}
    >
      <NavIcon name={icon} className={`size-5 ${active ? "text-gold" : ""}`} />
      <span>{label}</span>
    </Link>
  );
}

function TabLink({ href, label, icon, active }: { href: string; label: string; icon: NavIconName; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-gold" : "text-parchment/75"}`}
    >
      <NavIcon name={icon} className="size-[22px]" />
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/practice") return pathname === "/practice" || pathname.startsWith("/session");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isFocused(pathname: string): boolean {
  return pathname.startsWith("/session") || /^\/battles\/(?!challenge(?:\/|$))[^/]+$/.test(pathname);
}
