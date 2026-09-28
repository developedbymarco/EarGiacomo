-- EarGiacomo note names.
-- Run this in the Supabase SQL editor after the leaderboard migration.
-- letters is A B C. solfege is fixed do: C is Do, and B is Si.

alter table public.profiles
  add column if not exists note_names text not null default 'letters';

alter table public.profiles
  drop constraint if exists profiles_note_names_check;

alter table public.profiles
  add constraint profiles_note_names_check
  check (note_names in ('letters', 'solfege'));

grant update (note_names) on table public.profiles to authenticated;

notify pgrst, 'reload schema';
