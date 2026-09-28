# EarGiacomo

A browser practice room for intervals, chords, and cadences.

```bash
npm test
npm run dev
```

Practice works without an account. Accounts use hosted Supabase:

1. Copy `.env.example` to `.env.local` and fill in the project URL, anon key, and service role key.
2. Run `supabase/migrations/20260927180000_profiles.sql` in the Supabase SQL editor.
3. In Authentication URL settings, allow `http://localhost:3000/auth/callback`.
4. Restart the dev server, then use Log in.
5. Run `supabase/migrations/20260927193000_curriculum.sql` in the SQL editor so the guided path can save mastery.
6. Run `supabase/migrations/20260927200000_economy.sql` so practice pays XP and Giacominos, and the next lesson has a price.
7. Run `supabase/migrations/20260927210000_depth.sql` for sixths through the fifteenth, inversions, sevenths, cadences, and the two extra piano characters.
8. Run `supabase/migrations/20260927220000_reward_payout.sql` so a path lesson is saved, the Giacominos stay on your balance, and any path pass already stored is credited.
9. Run `supabase/migrations/20260927230000_friends.sql` for friend requests, blocks, and profile privacy.
10. Run `supabase/migrations/20260927240000_battles.sql` for friend battles. A match can be free, or staked at 10, 25, or 50 Giacominos.
11. Run `supabase/migrations/20260928000000_round_payout.sql` so every round pays Giacominos, including a round with no correct answers.
12. Run `supabase/migrations/20260928010000_presentation_lessons.sql` so listening lessons build from ascending to descending, melodic, harmonic, and then mixed.

The finished site is meant to run on a VPS. Auth and data stay on hosted Supabase.

Pushes to `main` run `.github/workflows/deploy.yml`. That copies the app to the VPS, builds it, and reloads PM2. `.env.local` stays on the server and is never copied from GitHub.

On the server, once: install Node.js 24 and PM2 for the deploy user, run `pm2 startup` so the process returns after a reboot, and put `.env.local` in the app directory. Set `NEXT_PUBLIC_APP_URL` to the public site URL. The app listens on `127.0.0.1:3000` for the reverse proxy. In Supabase, allow `https://your-domain/auth/callback`.

Repository secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Optional: `VPS_PORT` (22) and `VPS_APP_DIR` (`/var/www/eargiacomo`).

The piano characters share Salamander Grand Piano samples by Alexander Holm (CC BY 3.0). See `public/samples/piano/CREDITS.txt`.
