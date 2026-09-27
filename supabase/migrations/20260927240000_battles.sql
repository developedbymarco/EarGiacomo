-- EarGiacomo battles.
-- Run this in the Supabase SQL editor after the friends migration.
-- 1v1 friend matches. The server stores the questions and the score.
-- Stake 0 is a free match. 10, 25, and 50 Giacominos are paid when the friend accepts.

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  preset text not null,
  question_count integer not null,
  stake integer not null,
  range_low integer not null,
  range_high integer not null,
  winner_id uuid references auth.users (id) on delete set null,
  challenger_score integer not null default 0,
  opponent_score integer not null default 0,
  challenger_correct integer not null default 0,
  opponent_correct integer not null default 0,
  challenger_answered integer not null default 0,
  opponent_answered integer not null default 0,
  challenger_xp integer not null default 0,
  opponent_xp integer not null default 0,
  stake_held boolean not null default false,
  settled boolean not null default false,
  refunded boolean not null default false,
  forfeit_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint battles_distinct check (challenger_id <> opponent_id),
  constraint battles_status check (status in ('pending', 'declined', 'cancelled', 'active', 'complete', 'forfeited')),
  constraint battles_preset check (preset in ('intervals', 'triads', 'sevenths', 'mixed', 'visual', 'cadences')),
  constraint battles_count check (question_count in (10, 20)),
  constraint battles_stake check (stake in (0, 10, 25, 50)),
  constraint battles_range check (range_high > range_low)
);

create table if not exists public.battle_secrets (
  battle_id uuid primary key references public.battles (id) on delete cascade,
  seed text not null
);

create table if not exists public.battle_questions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  question_index integer not null,
  stimulus jsonb not null,
  correct_answer text not null,
  unique (battle_id, question_index)
);

create table if not exists public.battle_opens (
  battle_id uuid not null references public.battles (id) on delete cascade,
  question_index integer not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (battle_id, question_index, user_id)
);

create table if not exists public.battle_answers (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  question_index integer not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  response_time_ms integer not null,
  score_awarded integer not null,
  submitted_at timestamptz not null default now(),
  unique (battle_id, question_index, user_id)
);

create index if not exists battles_challenger_idx on public.battles (challenger_id, status);
create index if not exists battles_opponent_idx on public.battles (opponent_id, status);

alter table public.battles enable row level security;
alter table public.battle_secrets enable row level security;
alter table public.battle_questions enable row level security;
alter table public.battle_opens enable row level security;
alter table public.battle_answers enable row level security;

drop policy if exists battles_read_own on public.battles;
create policy battles_read_own on public.battles
  for select to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid());

revoke all on public.battles from anon, authenticated;
revoke all on public.battle_secrets from anon, authenticated;
revoke all on public.battle_questions from anon, authenticated;
revoke all on public.battle_opens from anon, authenticated;
revoke all on public.battle_answers from anon, authenticated;

grant select (
  id, challenger_id, opponent_id, status, preset, question_count, stake,
  range_low, range_high, winner_id,
  challenger_score, opponent_score, challenger_correct, opponent_correct,
  challenger_answered, opponent_answered, challenger_xp, opponent_xp,
  stake_held, settled, refunded, forfeit_by,
  created_at, started_at, completed_at, updated_at
) on public.battles to authenticated;

alter table public.battles replica identity full;

create or replace function public.settle_battle(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.battles%rowtype;
  forfeiter_answered integer;
  challenger_reward integer := 0;
  opponent_reward integer := 0;
  challenger_experience integer := 0;
  opponent_experience integer := 0;
begin
  select * into b from public.battles where id = p_id for update;
  if not found or b.settled then
    return;
  end if;

  if b.status = 'forfeited' then
    forfeiter_answered := case
      when b.forfeit_by = b.challenger_id then b.challenger_answered
      else b.opponent_answered
    end;
    if forfeiter_answered < 3 then
      b.refunded := true;
      b.winner_id := null;
    else
      b.winner_id := case when b.forfeit_by = b.challenger_id then b.opponent_id else b.challenger_id end;
    end if;
  elsif b.status = 'active'
    and b.challenger_answered >= b.question_count
    and b.opponent_answered >= b.question_count then
    b.status := 'complete';
    if b.challenger_score = b.opponent_score then
      b.winner_id := null;
    elsif b.challenger_score > b.opponent_score then
      b.winner_id := b.challenger_id;
    else
      b.winner_id := b.opponent_id;
    end if;
  else
    return;
  end if;

  if b.stake_held and b.stake > 0 then
    if b.refunded or b.winner_id is null then
      challenger_reward := b.stake;
      opponent_reward := b.stake;
    elsif b.winner_id = b.challenger_id then
      challenger_reward := b.stake * 2;
    else
      opponent_reward := b.stake * 2;
    end if;
  end if;

  if not b.refunded then
    if b.challenger_answered > 0 then
      challenger_experience := 10;
    end if;
    if b.opponent_answered > 0 then
      opponent_experience := 10;
    end if;
    if b.winner_id = b.challenger_id then
      challenger_experience := challenger_experience + 25;
    elsif b.winner_id = b.opponent_id then
      opponent_experience := opponent_experience + 25;
    end if;
    if b.status = 'forfeited' and b.forfeit_by = b.challenger_id then
      challenger_experience := 0;
    elsif b.status = 'forfeited' and b.forfeit_by = b.opponent_id then
      opponent_experience := 0;
    end if;
  end if;

  perform set_config('eargiacomo.allow_rewards', '1', true);
  update public.profiles
  set xp = xp + challenger_experience,
      giacominos = giacominos + challenger_reward,
      account_level = public.level_for_xp(xp + challenger_experience)
  where id = b.challenger_id;
  update public.profiles
  set xp = xp + opponent_experience,
      giacominos = giacominos + opponent_reward,
      account_level = public.level_for_xp(xp + opponent_experience)
  where id = b.opponent_id;

  update public.battles
  set status = b.status,
      winner_id = b.winner_id,
      refunded = b.refunded,
      settled = true,
      challenger_xp = challenger_experience,
      opponent_xp = opponent_experience,
      completed_at = now(),
      updated_at = now()
  where id = b.id;
end;
$$;

create or replace function public.create_battle(
  p_username text,
  p_preset text,
  p_count integer,
  p_stake integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  other uuid;
  challenges_open boolean;
  pair_status text;
  pending_count integer;
  battle_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if p_preset not in ('intervals', 'triads', 'sevenths', 'mixed', 'visual', 'cadences')
     or p_count not in (10, 20)
     or p_stake not in (0, 10, 25, 50) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select id, allow_challenges into other, challenges_open
  from public.profiles
  where username = lower(trim(p_username));
  if other is null then
    return jsonb_build_object('ok', false, 'reason', 'hidden');
  end if;
  if other = uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  if challenges_open is false then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  select f.status into pair_status
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(uid, other)
    and greatest(f.requester_id, f.addressee_id) = greatest(uid, other);
  if pair_status is distinct from 'accepted' then
    return jsonb_build_object('ok', false, 'reason', 'hidden');
  end if;

  if exists (
    select 1 from public.battles
    where status in ('pending', 'active')
      and least(challenger_id, opponent_id) = least(uid, other)
      and greatest(challenger_id, opponent_id) = greatest(uid, other)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  select count(*)::integer into pending_count
  from public.battles
  where challenger_id = uid and status = 'pending';
  if pending_count >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'slow');
  end if;

  insert into public.battles (challenger_id, opponent_id, status, preset, question_count, stake, range_low, range_high)
  values (uid, other, 'pending', p_preset, p_count, p_stake, 48, 84)
  returning id into battle_id;
  return jsonb_build_object('ok', true, 'battleId', battle_id);
end;
$$;

create or replace function public.respond_battle(p_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.battles%rowtype;
  v_seed text;
  challenger_balance bigint;
  opponent_balance bigint;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into b from public.battles where id = p_id for update;
  if not found or b.opponent_id <> uid or b.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if not p_accept then
    update public.battles set status = 'declined', updated_at = now() where id = b.id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;

  if b.stake > 0 then
    select giacominos into challenger_balance from public.profiles where id = b.challenger_id for update;
    select giacominos into opponent_balance from public.profiles where id = b.opponent_id for update;
    if coalesce(challenger_balance, 0) < b.stake or coalesce(opponent_balance, 0) < b.stake then
      return jsonb_build_object('ok', false, 'reason', 'broke');
    end if;
    perform set_config('eargiacomo.allow_rewards', '1', true);
    update public.profiles set giacominos = giacominos - b.stake where id = b.challenger_id;
    update public.profiles set giacominos = giacominos - b.stake where id = b.opponent_id;
  end if;

  v_seed := gen_random_uuid()::text;
  insert into public.battle_secrets (battle_id, seed) values (b.id, v_seed);
  update public.battles
  set status = 'active',
      stake_held = true,
      started_at = now(),
      updated_at = now()
  where id = b.id;
  return jsonb_build_object('ok', true, 'status', 'active', 'seed', v_seed);
end;
$$;

create or replace function public.battle_setup(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.battles%rowtype;
  v_seed text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into b from public.battles where id = p_id;
  if not found or (b.challenger_id <> uid and b.opponent_id <> uid) or b.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if exists (select 1 from public.battle_questions where battle_id = b.id) then
    return jsonb_build_object('ok', true, 'ready', true);
  end if;
  select seed into v_seed from public.battle_secrets where battle_id = b.id;
  if v_seed is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object(
    'ok', true,
    'ready', false,
    'seed', v_seed,
    'preset', b.preset,
    'count', b.question_count
  );
end;
$$;

create or replace function public.install_battle_questions(p_id uuid, p_seed text, p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.battles%rowtype;
  v_seed text;
  item jsonb;
  item_index integer;
  seen integer[] := '{}';
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into b from public.battles where id = p_id for update;
  if not found or (b.challenger_id <> uid and b.opponent_id <> uid) or b.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if (select count(*) from public.battle_questions where battle_id = b.id) >= b.question_count then
    return jsonb_build_object('ok', true);
  end if;
  select seed into v_seed from public.battle_secrets where battle_id = b.id;
  if v_seed is null or v_seed is distinct from p_seed then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> b.question_count then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  for item in select value from jsonb_array_elements(p_questions)
  loop
    item_index := (item->>'questionIndex')::integer;
    if item_index is null or item_index < 0 or item_index >= b.question_count then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    if item_index = any (seen) or jsonb_typeof(item->'stimulus') <> 'object' or coalesce(item->>'correctAnswer', '') = '' then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    seen := array_append(seen, item_index);
    insert into public.battle_questions (battle_id, question_index, stimulus, correct_answer)
    values (b.id, item_index, item->'stimulus', item->>'correctAnswer')
    on conflict (battle_id, question_index) do nothing;
  end loop;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.battle_view(p_id uuid, p_open boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.battles%rowtype;
  you_name text;
  them_name text;
  you_display text;
  them_display text;
  next_index integer;
  row_stimulus jsonb;
  side text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into b from public.battles where id = p_id;
  if not found or (b.challenger_id <> uid and b.opponent_id <> uid) then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  side := case when b.challenger_id = uid then 'challenger' else 'opponent' end;
  select username, display_name into you_name, you_display from public.profiles where id = uid;
  select username, display_name into them_name, them_display
  from public.profiles
  where id = case when side = 'challenger' then b.opponent_id else b.challenger_id end;

  if b.status = 'active' then
    select min(q.question_index) into next_index
    from public.battle_questions q
    where q.battle_id = b.id
      and not exists (
        select 1 from public.battle_answers a
        where a.battle_id = b.id and a.user_id = uid and a.question_index = q.question_index
      );
    if next_index is not null then
      select case
        when q.stimulus->>'mode' = 'audio' then q.stimulus - 'spelled' - 'spelledChords'
        else q.stimulus
      end
      into row_stimulus
      from public.battle_questions q
      where q.battle_id = b.id and q.question_index = next_index;
      if p_open then
        insert into public.battle_opens (battle_id, question_index, user_id)
        values (b.id, next_index, uid)
        on conflict do nothing;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', b.id,
    'status', b.status,
    'preset', b.preset,
    'stake', b.stake,
    'questionCount', b.question_count,
    'youAre', side,
    'you', jsonb_build_object(
      'username', you_name,
      'displayName', you_display,
      'score', case when side = 'challenger' then b.challenger_score else b.opponent_score end,
      'answered', case when side = 'challenger' then b.challenger_answered else b.opponent_answered end,
      'correct', case when side = 'challenger' then b.challenger_correct else b.opponent_correct end
    ),
    'them', jsonb_build_object(
      'username', them_name,
      'displayName', them_display,
      'score', case when side = 'challenger' then b.opponent_score else b.challenger_score end,
      'answered', case when side = 'challenger' then b.opponent_answered else b.challenger_answered end,
      'correct', case when side = 'challenger' then b.opponent_correct else b.challenger_correct end
    ),
    'winner', case
      when not b.settled or b.refunded then null
      when b.winner_id is null then 'draw'
      when b.winner_id = uid then 'you'
      else 'them'
    end,
    'refunded', b.refunded,
    'yourXp', case when side = 'challenger' then b.challenger_xp else b.opponent_xp end,
    'question', row_stimulus,
    'questionIndex', next_index
  );
end;
$$;

create or replace function public.submit_battle_answer(p_id uuid, p_index integer, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.battles%rowtype;
  q public.battle_questions%rowtype;
  opened timestamptz;
  elapsed integer;
  is_correct boolean;
  streak integer := 0;
  prior boolean;
  awarded integer;
  speed integer;
  existing public.battle_answers%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_answer is null or char_length(p_answer) > 40 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into b from public.battles where id = p_id for update;
  if not found or (b.challenger_id <> uid and b.opponent_id <> uid) or b.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select * into existing
  from public.battle_answers
  where battle_id = b.id and user_id = uid and question_index = p_index;
  if found then
    select * into q from public.battle_questions where battle_id = b.id and question_index = p_index;
    return jsonb_build_object(
      'ok', true,
      'correct', existing.is_correct,
      'correctAnswer', q.correct_answer,
      'spelled', coalesce(q.stimulus->'spelled', '[]'::jsonb),
      'awarded', existing.score_awarded,
      'duplicate', true,
      'yourScore', case when b.challenger_id = uid then b.challenger_score else b.opponent_score end,
      'theirScore', case when b.challenger_id = uid then b.opponent_score else b.challenger_score end,
      'yourAnswered', case when b.challenger_id = uid then b.challenger_answered else b.opponent_answered end,
      'theirAnswered', case when b.challenger_id = uid then b.opponent_answered else b.challenger_answered end,
      'questionCount', b.question_count,
      'status', b.status,
      'refunded', b.refunded,
      'winner', case
        when not b.settled or b.refunded then null
        when b.winner_id is null then 'draw'
        when b.winner_id = uid then 'you'
        else 'them'
      end
    );
  end if;

  select * into q from public.battle_questions where battle_id = b.id and question_index = p_index;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if not (q.stimulus->'answerChoices' @> to_jsonb(p_answer)) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select opened_at into opened
  from public.battle_opens
  where battle_id = b.id and question_index = p_index and user_id = uid;
  if opened is null then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  elapsed := greatest(0, floor(extract(epoch from (clock_timestamp() - opened)) * 1000))::integer;
  is_correct := p_answer = q.correct_answer;
  if is_correct then
    streak := 1;
    for prior in
      select a.is_correct
      from public.battle_answers a
      where a.battle_id = b.id and a.user_id = uid and a.question_index < p_index
      order by a.question_index desc
    loop
      exit when not prior;
      streak := streak + 1;
    end loop;
  end if;
  speed := case when elapsed >= 10000 then 0 else round(50 * (1 - elapsed / 10000.0))::integer end;
  awarded := case
    when not is_correct then 0
    else 100 + speed + case when streak >= 5 then 20 when streak >= 3 then 10 else 0 end
  end;

  insert into public.battle_answers (battle_id, question_index, user_id, answer, is_correct, response_time_ms, score_awarded)
  values (b.id, p_index, uid, p_answer, is_correct, elapsed, awarded);

  if b.challenger_id = uid then
    update public.battles
    set challenger_score = challenger_score + awarded,
        challenger_answered = challenger_answered + 1,
        challenger_correct = challenger_correct + case when is_correct then 1 else 0 end,
        updated_at = now()
    where id = b.id;
  else
    update public.battles
    set opponent_score = opponent_score + awarded,
        opponent_answered = opponent_answered + 1,
        opponent_correct = opponent_correct + case when is_correct then 1 else 0 end,
        updated_at = now()
    where id = b.id;
  end if;

  perform public.settle_battle(b.id);
  select * into b from public.battles where id = p_id;
  return jsonb_build_object(
    'ok', true,
    'correct', is_correct,
    'correctAnswer', q.correct_answer,
    'spelled', coalesce(q.stimulus->'spelled', '[]'::jsonb),
    'awarded', awarded,
    'yourScore', case when b.challenger_id = uid then b.challenger_score else b.opponent_score end,
    'theirScore', case when b.challenger_id = uid then b.opponent_score else b.challenger_score end,
    'yourAnswered', case when b.challenger_id = uid then b.challenger_answered else b.opponent_answered end,
    'theirAnswered', case when b.challenger_id = uid then b.opponent_answered else b.challenger_answered end,
    'questionCount', b.question_count,
    'status', b.status,
    'refunded', b.refunded,
    'winner', case
      when not b.settled or b.refunded then null
      when b.winner_id is null then 'draw'
      when b.winner_id = uid then 'you'
      else 'them'
    end
  );
end;
$$;

create or replace function public.battle_pulse(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b public.battles%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into b from public.battles where id = p_id;
  if not found or (b.challenger_id <> uid and b.opponent_id <> uid) then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object(
    'ok', true,
    'status', b.status,
    'stake', b.stake,
    'questionCount', b.question_count,
    'yourScore', case when b.challenger_id = uid then b.challenger_score else b.opponent_score end,
    'theirScore', case when b.challenger_id = uid then b.opponent_score else b.challenger_score end,
    'yourAnswered', case when b.challenger_id = uid then b.challenger_answered else b.opponent_answered end,
    'theirAnswered', case when b.challenger_id = uid then b.opponent_answered else b.challenger_answered end,
    'refunded', b.refunded,
    'winner', case
      when not b.settled or b.refunded then null
      when b.winner_id is null then 'draw'
      when b.winner_id = uid then 'you'
      else 'them'
    end
  );
end;
$$;

create or replace function public.cancel_battle(p_id uuid)
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
  update public.battles
  set status = 'cancelled', updated_at = now()
  where id = p_id and challenger_id = uid and status = 'pending'
  returning id into updated_id;
  if updated_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.forfeit_battle(p_id uuid)
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
  update public.battles
  set status = 'forfeited', forfeit_by = uid, updated_at = now()
  where id = p_id
    and status = 'active'
    and (challenger_id = uid or opponent_id = uid)
  returning id into updated_id;
  if updated_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  perform public.settle_battle(p_id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.list_battles()
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
    'incoming', coalesce((
      select jsonb_agg(public.battle_card(b, uid) order by b.created_at desc)
      from public.battles b
      where b.opponent_id = uid and b.status = 'pending'
    ), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(public.battle_card(b, uid) order by b.created_at desc)
      from public.battles b
      where b.challenger_id = uid and b.status = 'pending'
    ), '[]'::jsonb),
    'active', coalesce((
      select jsonb_agg(public.battle_card(b, uid) order by b.updated_at desc)
      from public.battles b
      where b.status = 'active' and (b.challenger_id = uid or b.opponent_id = uid)
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(card.item order by card.finished desc)
      from (
        select public.battle_card(b, uid) as item, b.completed_at as finished
        from public.battles b
        where b.status in ('complete', 'forfeited')
          and (b.challenger_id = uid or b.opponent_id = uid)
        order by b.completed_at desc nulls last
        limit 12
      ) card
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.battle_card(b public.battles, uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  other uuid;
  other_name text;
  other_display text;
  you_score integer;
  them_score integer;
begin
  other := case when b.challenger_id = uid then b.opponent_id else b.challenger_id end;
  you_score := case when b.challenger_id = uid then b.challenger_score else b.opponent_score end;
  them_score := case when b.challenger_id = uid then b.opponent_score else b.challenger_score end;
  select username, display_name into other_name, other_display from public.profiles where id = other;
  return jsonb_build_object(
    'id', b.id,
    'status', b.status,
    'preset', b.preset,
    'stake', b.stake,
    'questionCount', b.question_count,
    'username', other_name,
    'displayName', other_display,
    'yourScore', you_score,
    'theirScore', them_score,
    'winner', case
      when not b.settled or b.refunded then null
      when b.winner_id is null then 'draw'
      when b.winner_id = uid then 'you'
      else 'them'
    end
  );
end;
$$;

create or replace function public.battle_record(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  other uuid;
  history_open boolean;
  wins integer;
  losses integer;
  draws integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select id, show_battle_history into other, history_open
  from public.profiles
  where username = lower(trim(coalesce(p_username, '')));
  if other is null or other = uid or history_open is false then
    return jsonb_build_object('ok', true, 'visible', false);
  end if;

  select
    count(*) filter (where winner_id = uid),
    count(*) filter (where winner_id = other),
    count(*) filter (where winner_id is null and refunded is false)
  into wins, losses, draws
  from public.battles
  where settled
    and status in ('complete', 'forfeited')
    and least(challenger_id, opponent_id) = least(uid, other)
    and greatest(challenger_id, opponent_id) = greatest(uid, other);

  return jsonb_build_object(
    'ok', true,
    'visible', true,
    'wins', wins,
    'losses', losses,
    'draws', draws,
    'played', wins + losses + draws
  );
end;
$$;

revoke all on function public.settle_battle(uuid) from public, anon, authenticated;
revoke all on function public.battle_card(public.battles, uuid) from public, anon, authenticated;

revoke all on function public.create_battle(text, text, integer, integer) from public, anon;
revoke all on function public.respond_battle(uuid, boolean) from public, anon;
revoke all on function public.battle_setup(uuid) from public, anon;
revoke all on function public.install_battle_questions(uuid, text, jsonb) from public, anon;
revoke all on function public.battle_view(uuid, boolean) from public, anon;
revoke all on function public.battle_pulse(uuid) from public, anon;
revoke all on function public.submit_battle_answer(uuid, integer, text) from public, anon;
revoke all on function public.cancel_battle(uuid) from public, anon;
revoke all on function public.forfeit_battle(uuid) from public, anon;
revoke all on function public.list_battles() from public, anon;
revoke all on function public.battle_record(text) from public, anon;

grant execute on function public.create_battle(text, text, integer, integer) to authenticated;
grant execute on function public.respond_battle(uuid, boolean) to authenticated;
grant execute on function public.battle_setup(uuid) to authenticated;
grant execute on function public.install_battle_questions(uuid, text, jsonb) to authenticated;
grant execute on function public.battle_view(uuid, boolean) to authenticated;
grant execute on function public.battle_pulse(uuid) to authenticated;
grant execute on function public.submit_battle_answer(uuid, integer, text) to authenticated;
grant execute on function public.cancel_battle(uuid) to authenticated;
grant execute on function public.forfeit_battle(uuid) to authenticated;
grant execute on function public.list_battles() to authenticated;
grant execute on function public.battle_record(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.battles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
