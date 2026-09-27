-- EarGiacomo accounts.
-- Apply this in the Supabase SQL editor, or with the Supabase CLI, before signup.
-- Clients can read and update their own profile. They cannot change xp, giacominos, or account level.
-- preferred_piano_id points at piano_instruments. Concert Grand is the only seeded piano.

create table public.piano_instruments (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true
);

insert into public.piano_instruments (id, slug, name, description)
values (
  '6f0c9a2e-4b17-4c3a-9d55-7e1b0c0a11e1',
  'concert-grand',
  'Concert Grand',
  'Clear and neutral.'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  account_level integer not null default 1,
  xp bigint not null default 0,
  giacominos bigint not null default 0,
  preferred_piano_id uuid references public.piano_instruments (id),
  default_range_low smallint,
  default_range_high smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 40
  ),
  constraint profiles_range_bounds check (
    (default_range_low is null and default_range_high is null)
    or (
      default_range_low between 21 and 108
      and default_range_high between 21 and 108
      and default_range_low < default_range_high
    )
  ),
  constraint profiles_xp_nonnegative check (xp >= 0),
  constraint profiles_giacominos_nonnegative check (giacominos >= 0),
  constraint profiles_level_positive check (account_level >= 1)
);

alter table public.piano_instruments enable row level security;
alter table public.profiles enable row level security;

create policy piano_instruments_read_active
  on public.piano_instruments
  for select
  to authenticated
  using (is_active);

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke all on public.piano_instruments from anon, authenticated;
grant select on public.piano_instruments to authenticated;

revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

create or replace function public.protect_profile_rewards()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    new.id := old.id;
    new.created_at := old.created_at;
    new.xp := old.xp;
    new.giacominos := old.giacominos;
    new.account_level := old.account_level;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect_rewards
  before update on public.profiles
  for each row
  execute function public.protect_profile_rewards();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text;
  piano uuid;
begin
  chosen := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if chosen !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username';
  end if;
  if exists (select 1 from public.profiles where username = chosen) then
    raise exception 'username_taken';
  end if;

  select id into piano from public.piano_instruments where slug = 'concert-grand';

  insert into public.profiles (
    id,
    username,
    display_name,
    preferred_piano_id,
    default_range_low,
    default_range_high
  )
  values (
    new.id,
    chosen,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 40), ''),
    piano,
    48,
    72
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username = lower(trim(candidate))
  );
$$;

revoke all on function public.protect_profile_rewards() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
