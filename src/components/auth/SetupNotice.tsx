import Link from "next/link";

export function SetupNotice() {
  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="font-serif text-5xl text-cream">Accounts</h1>
      <p className="text-lg text-parchment">
        Practice is open without an account. Sign-up, login, and saved pitch range need a hosted Supabase project.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-parchment">
        <li>Create a project and copy the URL, anon key, and service role key into `.env.local`.</li>
        <li>Run `supabase/migrations/20260927180000_profiles.sql` in the Supabase SQL editor.</li>
        <li>Allow `http://localhost:3000/auth/callback` as a redirect URL, then restart the dev server.</li>
      </ol>
      <p>
        <Link href="/practice" className="text-gold underline-offset-4 hover:underline">
          Continue practicing
        </Link>
      </p>
    </section>
  );
}
