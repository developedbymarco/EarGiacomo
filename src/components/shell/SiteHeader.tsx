import Link from "next/link";
import { SiteNav } from "@/components/shell/SiteNav";

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
    <header className="relative border-b border-gold/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="shrink-0 font-serif text-3xl tracking-wide text-cream">
          EarGiacomo
        </Link>
        <SiteNav signedIn={signedIn} xp={xp} giacominos={giacominos} />
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
