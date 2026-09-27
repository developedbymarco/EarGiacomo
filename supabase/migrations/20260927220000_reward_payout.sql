-- EarGiacomo reward payout.
-- Run this in the Supabase SQL editor after the depth migration.
-- Path lessons were rejected before they could be saved: the score function
-- used the name difficulty for both a variable and a column. This replaces
-- that function, lets the Giacominos stay on the profile, and credits any
-- path pass that was already stored.

create or replace function public.record_practice_result(
  p_mode text,
  p_node_slug text,
  p_token text,
  p_attempts jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  element jsonb;
  attempt_row record;
  concept text;
  chosen text;
  was_correct boolean;
  repeats integer;
  delta integer;
  current_mastery numeric;
  current_attempts integer;
  current_correct integer;
  current_map jsonb;
  node uuid;
  node_cost integer := 0;
  lesson_difficulty integer := 1;
  lesson_xp integer := 10;
  concept_list text[];
  total integer := 0;
  correct_count integer := 0;
  total_repeats integer := 0;
  session_id uuid;
  passed boolean := false;
  prereq_ok boolean;
  prior_passes integer := 0;
  had_pass_today boolean := false;
  was_mastered boolean := false;
  now_mastered boolean := false;
  v_xp integer := 0;
  v_coins integer := 0;
  new_level integer := 1;
  new_balance bigint := 0;
  unlocked_slugs text[] := array[]::text[];
  purchasable jsonb := '[]'::jsonb;
  dep record;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_mode not in ('practice', 'guided', 'review') then
    raise exception 'invalid_mode';
  end if;
  if p_token is null or char_length(p_token) < 8 or char_length(p_token) > 80 then
    raise exception 'invalid_token';
  end if;
  if jsonb_typeof(p_attempts) <> 'array'
    or jsonb_array_length(p_attempts) < 1
    or jsonb_array_length(p_attempts) > 100 then
    raise exception 'invalid_attempts';
  end if;

  for attempt_row in select value from jsonb_array_elements(p_attempts) as attempts(value)
  loop
    element := attempt_row.value;
    concept := element->>'conceptKey';
    chosen := element->>'chosenKey';
    if concept !~ '^(interval|chord|cadence):[A-Za-z0-9]+$' or chosen !~ '^(interval|chord|cadence):[A-Za-z0-9]+$' then
      raise exception 'invalid_concept';
    end if;
    repeats := least(greatest(coalesce((element->>'repeats')::int, 0), 0), 20);
    total := total + 1;
    total_repeats := total_repeats + repeats;
    if coalesce((element->>'correct')::boolean, false) then
      correct_count := correct_count + 1;
    end if;
  end loop;

  if p_mode = 'guided' and p_node_slug is not null then
    select n.id, n.unlock_cost, n.difficulty, n.xp_reward, n.concepts
      into node, node_cost, lesson_difficulty, lesson_xp, concept_list
    from public.curriculum_nodes n
    where n.slug = p_node_slug and n.is_active;
    if node is null then
      raise exception 'unknown_lesson';
    end if;
    select not exists (
      select 1
      from public.curriculum_prerequisites cp
      where cp.node_id = node
        and not exists (
          select 1
          from public.practice_sessions s
          where s.user_id = uid
            and s.node_id = cp.prerequisite_node_id
            and s.mode = 'guided'
            and s.completed_at is not null
            and s.correct_count * 5 >= s.question_count * 4
        )
    ) into prereq_ok;
    if not prereq_ok
      or (node_cost > 0 and not exists (
        select 1 from public.user_unlocks u where u.user_id = uid and u.node_id = node
      )) then
      p_mode := 'practice';
      node := null;
    end if;
  else
    node := null;
    if p_mode = 'guided' then
      p_mode := 'practice';
    end if;
  end if;

  session_id := gen_random_uuid();
  with inserted as (
    insert into public.practice_sessions (
      id, user_id, mode, node_id, question_count, correct_count, xp_earned, giacominos_earned, settings, client_token, completed_at
    ) values (
      session_id, uid, p_mode, node, total, correct_count, 0, 0,
      jsonb_build_object('nodeSlug', p_node_slug), p_token, now()
    )
    on conflict (client_token) do nothing
    returning id
  )
  select id into session_id from inserted;

  if not found then
    return jsonb_build_object(
      'duplicate', true,
      'passed', false,
      'correct', correct_count,
      'total', total,
      'unlocked', '[]'::jsonb,
      'purchasable', '[]'::jsonb,
      'xpEarned', 0,
      'giacominosEarned', 0
    );
  end if;

  if node is not null then
    select count(*) into prior_passes
    from public.practice_sessions s
    where s.user_id = uid
      and s.node_id = node
      and s.mode = 'guided'
      and s.id <> session_id
      and s.completed_at is not null
      and s.correct_count * 5 >= s.question_count * 4;

    select exists (
      select 1
      from public.practice_sessions s
      where s.user_id = uid
        and s.mode = 'guided'
        and s.id <> session_id
        and s.completed_at is not null
        and s.correct_count * 5 >= s.question_count * 4
        and timezone('utc', s.completed_at)::date = timezone('utc', now())::date
    ) into had_pass_today;

    select coalesce(bool_and(coalesce(m.mastery, 0) >= 80), false)
      into was_mastered
    from unnest(concept_list) as listed(concept_key)
    left join public.user_mastery m
      on m.user_id = uid and m.concept_key = listed.concept_key;
  end if;

  for attempt_row in select value from jsonb_array_elements(p_attempts) as attempts(value)
  loop
    element := attempt_row.value;
    concept := element->>'conceptKey';
    chosen := element->>'chosenKey';
    was_correct := coalesce((element->>'correct')::boolean, false);
    repeats := least(greatest(coalesce((element->>'repeats')::int, 0), 0), 20);
    if was_correct then
      delta := case when repeats = 0 then 3 else 2 end;
    else
      delta := -2;
    end if;

    select mastery, attempts, correct, confusion_map
      into current_mastery, current_attempts, current_correct, current_map
    from public.user_mastery
    where user_id = uid and concept_key = concept;

    if not found then
      current_mastery := 0;
      current_attempts := 0;
      current_correct := 0;
      current_map := '{}'::jsonb;
    end if;

    current_mastery := least(100, greatest(0, current_mastery + delta));
    current_attempts := current_attempts + 1;
    if was_correct then
      current_correct := current_correct + 1;
    else
      current_map := jsonb_set(
        coalesce(current_map, '{}'::jsonb),
        array[chosen],
        to_jsonb(coalesce((current_map->>chosen)::int, 0) + 1),
        true
      );
    end if;

    insert into public.user_mastery (
      user_id, concept_key, mastery, attempts, correct, last_practiced_at, last_correct, confusion_map
    ) values (
      uid, concept, current_mastery, current_attempts, current_correct, now(), was_correct, current_map
    )
    on conflict (user_id, concept_key) do update
      set mastery = excluded.mastery,
          attempts = excluded.attempts,
          correct = excluded.correct,
          last_practiced_at = excluded.last_practiced_at,
          last_correct = excluded.last_correct,
          confusion_map = excluded.confusion_map;

    insert into public.question_attempts (
      session_id, user_id, question_type, stimulus, correct_answer, user_answer, is_correct, repeat_count, concept_key
    ) values (
      session_id, uid, split_part(concept, ':', 1),
      jsonb_build_object('conceptKey', concept),
      jsonb_build_object('conceptKey', concept),
      jsonb_build_object('conceptKey', chosen),
      was_correct, repeats, concept
    );
  end loop;

  v_xp := total + correct_count * 4;

  if p_mode = 'guided' and node is not null and correct_count * 5 >= total * 4 then
    passed := true;
    v_xp := v_xp + lesson_xp;
    if correct_count = total and total_repeats = 0 then
      v_xp := v_xp + 20;
    end if;

    if lesson_difficulty <= 1 then
      v_coins := case when prior_passes = 0 then 15 else 5 end;
    elsif lesson_difficulty = 2 then
      v_coins := case when prior_passes = 0 then 25 else 8 end;
    elsif lesson_difficulty = 3 then
      v_coins := case when prior_passes = 0 then 35 else 10 end;
    else
      v_coins := case when prior_passes = 0 then 50 else 15 end;
    end if;
    if was_mastered then
      v_coins := greatest(2, v_coins / 2);
    end if;
    if not had_pass_today then
      v_coins := v_coins + 10;
    end if;

    select coalesce(bool_and(coalesce(m.mastery, 0) >= 80), false)
      into now_mastered
    from unnest(concept_list) as listed(concept_key)
    left join public.user_mastery m
      on m.user_id = uid and m.concept_key = listed.concept_key;
    if now_mastered and not was_mastered then
      v_coins := v_coins + 10;
    end if;

    for dep in
      select n.id, n.slug, n.unlock_cost
      from public.curriculum_nodes n
      join public.curriculum_prerequisites cp on cp.node_id = n.id and cp.prerequisite_node_id = node
    loop
      if exists (
        select 1
        from public.curriculum_prerequisites cp2
        where cp2.node_id = dep.id
          and not exists (
            select 1
            from public.practice_sessions s
            where s.user_id = uid
              and s.node_id = cp2.prerequisite_node_id
              and s.mode = 'guided'
              and s.completed_at is not null
              and s.correct_count * 5 >= s.question_count * 4
          )
      ) then
        continue;
      end if;
      if dep.unlock_cost > 0 then
        purchasable := purchasable || jsonb_build_array(
          jsonb_build_object('slug', dep.slug, 'cost', dep.unlock_cost)
        );
        continue;
      end if;
      insert into public.user_unlocks (user_id, node_id, cost_paid)
      values (uid, dep.id, 0)
      on conflict do nothing;
      unlocked_slugs := array_append(unlocked_slugs, dep.slug);
    end loop;
  end if;

  update public.practice_sessions
  set xp_earned = v_xp, giacominos_earned = v_coins
  where id = session_id;

  perform set_config('eargiacomo.allow_rewards', '1', true);
  update public.profiles
  set xp = xp + v_xp,
      giacominos = giacominos + v_coins,
      account_level = public.level_for_xp(xp + v_xp)
  where id = uid
  returning account_level, giacominos into new_level, new_balance;

  return jsonb_build_object(
    'duplicate', false,
    'passed', passed,
    'correct', correct_count,
    'total', total,
    'unlocked', to_jsonb(unlocked_slugs),
    'purchasable', purchasable,
    'xpEarned', v_xp,
    'giacominosEarned', v_coins,
    'accountLevel', new_level,
    'giacominos', new_balance
  );
end;
$$;


create or replace function public.protect_profile_rewards()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

revoke update on table public.profiles from authenticated;
grant update (
  username,
  display_name,
  avatar_url,
  preferred_piano_id,
  default_range_low,
  default_range_high
) on table public.profiles to authenticated;

with passes as (
  select
    s.id,
    n.difficulty,
    s.giacominos_earned,
    row_number() over (
      partition by s.user_id, s.node_id
      order by s.completed_at, s.id
    ) as pass_n,
    row_number() over (
      partition by s.user_id, (timezone('utc', s.completed_at))::date
      order by s.completed_at, s.id
    ) as day_n
  from public.practice_sessions s
  join public.curriculum_nodes n on n.id = s.node_id
  where s.mode = 'guided'
    and s.completed_at is not null
    and s.question_count > 0
    and s.correct_count * 5 >= s.question_count * 4
),
owed as (
  select
    id,
    (
      case
        when difficulty <= 1 then case when pass_n = 1 then 15 else 5 end
        when difficulty = 2 then case when pass_n = 1 then 25 else 8 end
        when difficulty = 3 then case when pass_n = 1 then 35 else 10 end
        else case when pass_n = 1 then 50 else 15 end
      end
      + case when day_n = 1 then 10 else 0 end
    ) as coins
  from passes
  where giacominos_earned = 0
)
update public.practice_sessions s
set giacominos_earned = owed.coins
from owed
where s.id = owed.id;

update public.profiles p
set
  xp = greatest(p.xp, owed.xp),
  giacominos = greatest(p.giacominos, owed.coins),
  account_level = public.level_for_xp(greatest(p.xp, owed.xp))
from (
  select
    p2.id,
    coalesce((
      select sum(s.xp_earned)::bigint
      from public.practice_sessions s
      where s.user_id = p2.id
    ), 0) as xp,
    greatest(
      0,
      coalesce((
        select sum(s.giacominos_earned)::bigint
        from public.practice_sessions s
        where s.user_id = p2.id
      ), 0)
      - coalesce((
        select sum(u.cost_paid)::bigint
        from public.user_unlocks u
        where u.user_id = p2.id
      ), 0)
    ) as coins
  from public.profiles p2
) owed
where p.id = owed.id
  and (p.xp < owed.xp or p.giacominos < owed.coins);

notify pgrst, 'reload schema';
