import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/shell/SiteHeader";
import { getAccountContext } from "@/lib/account/session";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-sans",
});

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "EarGiacomo",
  description: "A quiet practice room for intervals, triads, and the notes on the page.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const account = await getAccountContext();
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <SiteHeader
          signedIn={Boolean(account.user)}
          xp={account.profile?.xp ?? null}
          giacominos={account.profile?.giacominos ?? null}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
