import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { RewardSummary } from "@/components/shell/RewardSummary";

const navLink =
  "rounded-full px-4 py-2 text-parchment hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

export function SiteHeader({
  signedIn,
  xp,
  giacominos,
}: {
  signedIn: boolean;
  xp: number | null;
  giacominos: number | null;
}) {
  return (
    <header className="border-b border-gold/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-serif text-3xl tracking-wide text-cream">
          EarGiacomo
        </Link>
        <nav className="flex flex-wrap items-center justify-end">
          <Link href="/path" className={navLink}>
            Path
          </Link>
          <Link href="/practice" className={navLink}>
            Practice
          </Link>
          <Link href="/exam" className={navLink}>
            Exam
          </Link>
          {signedIn ? (
            <Link href="/friends" className={navLink}>
              Friends
            </Link>
          ) : null}
          {signedIn ? (
            <>
              {xp != null && giacominos != null ? <RewardSummary xp={xp} giacominos={giacominos} /> : null}
              <Link href="/account" className={navLink}>
                Account
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={navLink}>
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className={navLink}>
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gold/20 px-4 py-6 text-center text-sm text-parchment/80">
      Piano characters share Salamander Grand Piano samples by Alexander Holm, CC BY 3.0.
    </footer>
  );
}
