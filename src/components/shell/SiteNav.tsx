"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { logoutAction } from "@/app/auth/actions";
import { RewardSummary } from "@/components/shell/RewardSummary";

const desktopLink =
  "rounded-full px-4 py-2 text-parchment hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

const mobileLink =
  "block rounded-2xl px-3 py-3 text-lg text-parchment hover:bg-plum hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

export function SiteNav({
  signedIn,
  xp,
  giacominos,
}: {
  signedIn: boolean;
  xp: number | null;
  giacominos: number | null;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [openOn, setOpenOn] = useState(pathname);
  if (openOn !== pathname) {
    setOpenOn(pathname);
    setOpen(false);
  }
  const links = [
    { href: "/path", label: "Path" },
    { href: "/practice", label: "Practice" },
    { href: "/exam", label: "Exam" },
    { href: "/leaderboard", label: "Board" },
    ...(signedIn
      ? [
          { href: "/friends", label: "Friends" },
          { href: "/battles", label: "Battles" },
        ]
      : []),
  ];

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-gold/70 bg-plum/70 text-cream hover:border-gold hover:bg-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream lg:hidden"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon open={open} />
      </button>
      <nav className="hidden items-center lg:flex" aria-label="Main">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={desktopLink}>
            {link.label}
          </Link>
        ))}
        <AccountLinks signedIn={signedIn} xp={xp} giacominos={giacominos} linkClass={desktopLink} />
      </nav>
      <nav
        id={menuId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 border-b border-gold/30 bg-espresso px-4 py-3 shadow-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-5xl">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={mobileLink}>
              {link.label}
            </Link>
          ))}
          <AccountLinks signedIn={signedIn} xp={xp} giacominos={giacominos} linkClass={mobileLink} layout="menu" />
        </div>
      </nav>
    </>
  );
}

function AccountLinks({
  signedIn,
  xp,
  giacominos,
  linkClass,
  layout = "inline",
}: {
  signedIn: boolean;
  xp: number | null;
  giacominos: number | null;
  linkClass: string;
  layout?: "inline" | "menu";
}) {
  if (!signedIn) {
    return (
      <Link href="/login" className={linkClass}>
        Log in
      </Link>
    );
  }
  return (
    <>
      {xp != null && giacominos != null ? <RewardSummary xp={xp} giacominos={giacominos} layout={layout} /> : null}
      <Link href="/account" className={linkClass}>
        Account
      </Link>
      <form action={logoutAction}>
        <button type="submit" className={linkClass}>
          Log out
        </button>
      </form>
    </>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      {open ? (
        <path d="M6 6 18 18 M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16 M4 12h16 M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  );
}
