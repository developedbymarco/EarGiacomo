-- EarGiacomo friends.
-- Run this in the Supabase SQL editor after the reward payout migration.
-- Adds friend requests, blocks, and profile privacy. Battles are not included.

alter table public.profiles
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists show_accuracy boolean not null default true,
  add column if not exists allow_challenges boolean not null default true,
  add column if not exists show_battle_history boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_visibility_check;

alter table public.profiles
  add constraint profiles_visibility_check
  check (profile_visibility in ('public', 'friends', 'private'));

grant update (
  profile_visibility,
  show_accuracy,
  allow_challenges,
  show_battle_history
) on table public.profiles to authenticated;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  blocked_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_distinct check (requester_id <> addressee_id),
  constraint friendships_status check (status in ('pending', 'accepted', 'declined', 'blocked')),
  constraint friendships_block_actor check (
    (status = 'blocked' and blocked_by is not null and (blocked_by = requester_id or blocked_by = addressee_id))
    or (status <> 'blocked' and blocked_by is null)
  )
);

create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

drop policy if exists friendships_read_own on public.friendships;
create policy friendships_read_own on public.friendships
  for select to authenticated
  using (
    (requester_id = auth.uid() or addressee_id = auth.uid())
    and (status <> 'blocked' or blocked_by = auth.uid())
  );

revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

create or replace function public.search_players(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  needle text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  needle := lower(trim(coalesce(p_query, '')));
  needle := replace(replace(replace(needle, '\', ''), '%', ''), '_', '');
  if char_length(needle) < 2 or needle !~ '^[a-z0-9_]+$' then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(found.item order by found.username)
    from (
      select
        p.username,
        jsonb_build_object(
          'username', p.username,
          'displayName', case
            when p.profile_visibility = 'public' or f.status = 'accepted' then p.display_name
            else null
          end,
          'level', case
            when p.profile_visibility = 'public' or f.status = 'accepted' then p.account_level
            else null
          end,
          'relation', case
            when f.status = 'accepted' then 'friends'
            when f.status = 'pending' and f.requester_id = uid then 'pending_out'
            when f.status = 'pending' and f.addressee_id = uid then 'pending_in'
            when f.status = 'blocked' and f.blocked_by = uid then 'blocked'
            else 'none'
          end,
          'friendshipId', f.id
        ) as item
      from public.profiles p
      left join public.friendships f
        on least(f.requester_id, f.addressee_id) = least(uid, p.id)
       and greatest(f.requester_id, f.addressee_id) = greatest(uid, p.id)
      where p.id <> uid
        and p.username like needle || '%'
        and p.profile_visibility <> 'private'
        and (f.blocked_by is null or f.blocked_by = uid)
      order by p.username
      limit 8
    ) found
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_friendships()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  return jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'username', p.username,
        'displayName', p.display_name,
        'level', p.account_level
      ) order by p.username)
      from public.friendships f
      join public.profiles p on p.id = case when f.requester_id = uid then f.addressee_id else f.requester_id end
      where f.status = 'accepted'
        and (f.requester_id = uid or f.addressee_id = uid)
    ), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'username', p.username,
        'displayName', p.display_name
      ) order by f.updated_at desc)
      from public.friendships f
      join public.profiles p on p.id = f.requester_id
      where f.status = 'pending' and f.addressee_id = uid
    ), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'username', p.username,
        'displayName', p.display_name
      ) order by f.updated_at desc)
      from public.friendships f
      join public.profiles p on p.id = f.addressee_id
      where f.status = 'pending' and f.requester_id = uid
    ), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'username', p.username
      ) order by p.username)
      from public.friendships f
      join public.profiles p on p.id = case when f.requester_id = uid then f.addressee_id else f.requester_id end
      where f.status = 'blocked' and f.blocked_by = uid
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.player_profile(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  player public.profiles%rowtype;
  pair public.friendships%rowtype;
  relation text := 'none';
  visible boolean := false;
  friendship_id uuid := null;
  accuracy integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select * into player
  from public.profiles
  where username = lower(trim(p_username));
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if player.id = uid then
    relation := 'self';
    visible := true;
  else
    select * into pair
    from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(uid, player.id)
      and greatest(f.requester_id, f.addressee_id) = greatest(uid, player.id);
    if found then
      friendship_id := pair.id;
      if pair.status = 'blocked' and pair.blocked_by is distinct from uid then
        return jsonb_build_object('ok', false, 'reason', 'hidden');
      elsif pair.status = 'blocked' then
        relation := 'blocked';
      elsif pair.status = 'accepted' then
        relation := 'friends';
        visible := true;
      elsif pair.status = 'pending' and pair.requester_id = uid then
        relation := 'pending_out';
      elsif pair.status = 'pending' and pair.addressee_id = uid then
        relation := 'pending_in';
      end if;
    end if;
    if player.profile_visibility = 'private' and relation <> 'friends' and relation <> 'blocked' then
      return jsonb_build_object('ok', false, 'reason', 'hidden');
    end if;
    if player.profile_visibility = 'public' or relation = 'friends' then
      visible := true;
    end if;
  end if;

  if relation = 'self' or (visible and player.show_accuracy) then
    select case
      when coalesce(sum(m.attempts), 0) = 0 then null
      else round(100.0 * sum(m.correct) / sum(m.attempts))::integer
    end
    into accuracy
    from public.user_mastery m
    where m.user_id = player.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'username', player.username,
    'displayName', case when visible then player.display_name else null end,
    'level', case when visible then player.account_level else null end,
    'accuracy', accuracy,
    'relation', relation,
    'friendshipId', friendship_id
  );
end;
$$;

create or replace function public.send_friend_request(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  other uuid;
  visibility text;
  pair public.friendships%rowtype;
  pending_count integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select id, profile_visibility into other, visibility
  from public.profiles
  where username = lower(trim(p_username));
  if other is null then
    return jsonb_build_object('ok', false, 'reason', 'hidden');
  end if;
  if other = uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  if visibility = 'private' then
    return jsonb_build_object('ok', false, 'reason', 'hidden');
  end if;

  select count(*)::integer into pending_count
  from public.friendships
  where requester_id = uid
    and status = 'pending';

  select * into pair
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(uid, other)
    and greatest(f.requester_id, f.addressee_id) = greatest(uid, other);

  if found then
    if pair.status = 'blocked' then
      return jsonb_build_object('ok', false, 'reason', 'hidden');
    end if;
    if pair.status = 'accepted' or (pair.status = 'pending' and pair.requester_id = uid) then
      return jsonb_build_object('ok', false, 'reason', 'already');
    end if;
    if pair.status = 'pending' and pair.addressee_id = uid then
      return jsonb_build_object('ok', false, 'reason', 'incoming');
    end if;
    if pair.status = 'declined' then
      if pending_count >= 15 then
        return jsonb_build_object('ok', false, 'reason', 'slow');
      end if;
      update public.friendships
      set requester_id = uid,
          addressee_id = other,
          status = 'pending',
          blocked_by = null,
          updated_at = now()
      where id = pair.id;
      return jsonb_build_object('ok', true);
    end if;
  end if;

  if pending_count >= 15 then
    return jsonb_build_object('ok', false, 'reason', 'slow');
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (uid, other, 'pending');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      updated_at = now()
  where id = p_id
    and addressee_id = uid
    and status = 'pending'
  returning id into updated_id;

  if updated_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_friend(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  removed_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.friendships
  where id = p_id
    and status = 'accepted'
    and (requester_id = uid or addressee_id = uid)
  returning id into removed_id;

  if removed_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.block_player(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  other uuid;
  pair public.friendships%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select id into other
  from public.profiles
  where username = lower(trim(p_username));
  if other is null or other = uid then
    return jsonb_build_object('ok', false, 'reason', 'hidden');
  end if;

  select * into pair
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(uid, other)
    and greatest(f.requester_id, f.addressee_id) = greatest(uid, other);

  if found then
    if pair.status = 'blocked' and pair.blocked_by is distinct from uid then
      return jsonb_build_object('ok', false, 'reason', 'hidden');
    end if;
    update public.friendships
    set status = 'blocked',
        blocked_by = uid,
        updated_at = now()
    where id = pair.id;
  else
    insert into public.friendships (requester_id, addressee_id, status, blocked_by)
    values (uid, other, 'blocked', uid);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.unblock_player(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  removed_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.friendships
  where id = p_id
    and status = 'blocked'
    and blocked_by = uid
  returning id into removed_id;

  if removed_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.search_players(text) from public, anon;
revoke all on function public.list_friendships() from public, anon;
revoke all on function public.player_profile(text) from public, anon;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.block_player(text) from public, anon;
revoke all on function public.unblock_player(uuid) from public, anon;

grant execute on function public.search_players(text) to authenticated;
grant execute on function public.list_friendships() to authenticated;
grant execute on function public.player_profile(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_player(text) to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;

notify pgrst, 'reload schema';
