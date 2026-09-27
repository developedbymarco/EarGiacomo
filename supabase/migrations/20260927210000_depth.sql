-- EarGiacomo depth: sixths through the fifteenth, inversions, open voicing, sevenths, and IV–I / V–I cadences.
-- Apply this in the Supabase SQL editor after the economy migration.
-- Existing lessons and unlocks are left in place.

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

insert into public.piano_instruments (id, slug, name, description)
values
  ('6f0c9a2e-4b17-4c3a-9d55-7e1b0c0a11e2', 'warm-felt', 'Warm Felt', 'Soft and intimate. Same samples, a darker filter.'),
  ('6f0c9a2e-4b17-4c3a-9d55-7e1b0c0a11e3', 'bright-classical', 'Bright Classical', 'Defined upper register. Same samples, a brighter touch.')
on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000000f'::uuid,
  'sixths',
  'Major and minor sixths',
  'Tell a minor sixth from a major sixth by ear.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"sixths","title":"Major and minor sixths","exerciseType":"interval-identification","intervals":["m6","M6"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m6', 'interval:M6']::text[],
  50
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000010'::uuid,
  'interval-sevenths',
  'Major and minor sevenths',
  'Tell a minor seventh from a major seventh by ear.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"interval-sevenths","title":"Major and minor sevenths","exerciseType":"interval-identification","intervals":["m7","M7"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m7', 'interval:M7']::text[],
  60
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000011'::uuid,
  'tritone',
  'The tritone',
  'The augmented fourth sits between the perfect fourth and the perfect fifth.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"tritone","title":"The tritone","exerciseType":"interval-identification","intervals":["P4","A4","P5"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:P4', 'interval:A4', 'interval:P5']::text[],
  70
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000012'::uuid,
  'ninths',
  'Major and minor ninths',
  'Compound seconds, past the octave.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"ninths","title":"Major and minor ninths","exerciseType":"interval-identification","intervals":["m9","M9"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m9', 'interval:M9']::text[],
  80
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000013'::uuid,
  'tenths',
  'Major and minor tenths',
  'Compound thirds.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"tenths","title":"Major and minor tenths","exerciseType":"interval-identification","intervals":["m10","M10"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m10', 'interval:M10']::text[],
  90
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000014'::uuid,
  'compound-perfect',
  'Elevenths and twelfths',
  'The perfect eleventh and the perfect twelfth.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"compound-perfect","title":"Elevenths and twelfths","exerciseType":"interval-identification","intervals":["P11","P12"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:P11', 'interval:P12']::text[],
  100
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000015'::uuid,
  'thirteenths',
  'Major and minor thirteenths',
  'Compound sixths.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"thirteenths","title":"Major and minor thirteenths","exerciseType":"interval-identification","intervals":["m13","M13"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m13', 'interval:M13']::text[],
  110
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000016'::uuid,
  'to-the-fifteenth',
  'To the fifteenth',
  'Fourteenths and the perfect fifteenth.',
  'interval',
  'intervals',
  4,
  80,
  10,
  '{"slug":"to-the-fifteenth","title":"To the fifteenth","exerciseType":"interval-identification","intervals":["m14","M14","P15"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m14', 'interval:M14', 'interval:P15']::text[],
  120
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000017'::uuid,
  'triad-inversions',
  'Triads in inversion',
  'Major and minor triads in root position, first inversion, and second inversion.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"triad-inversions","title":"Triads in inversion","exerciseType":"chord-identification","qualities":["major","minor"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0,1,2],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major', 'chord:minor']::text[],
  40
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000018'::uuid,
  'open-triads',
  'Open triads',
  'The four triads, spread wider than an octave.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"open-triads","title":"Open triads","exerciseType":"chord-identification","qualities":["major","minor","augmented","diminished"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["open"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major', 'chord:minor', 'chord:augmented', 'chord:diminished']::text[],
  50
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000019'::uuid,
  'major-dominant-sevenths',
  'Major and dominant sevenths',
  'A major seventh against a dominant seventh.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"major-dominant-sevenths","title":"Major and dominant sevenths","exerciseType":"chord-identification","qualities":["major7","dominant7"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major7', 'chord:dominant7']::text[],
  60
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000001a'::uuid,
  'minor-sevenths',
  'Minor sevenths',
  'The minor seventh joins the major seventh and the dominant seventh.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"minor-sevenths","title":"Minor sevenths","exerciseType":"chord-identification","qualities":["minor7","major7","dominant7"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:minor7', 'chord:major7', 'chord:dominant7']::text[],
  70
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000001b'::uuid,
  'diminished-sevenths',
  'Diminished sevenths',
  'Half-diminished and diminished sevenths, beside the minor seventh.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"diminished-sevenths","title":"Diminished sevenths","exerciseType":"chord-identification","qualities":["halfDiminished7","diminished7","minor7"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:halfDiminished7', 'chord:diminished7', 'chord:minor7']::text[],
  80
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000001c'::uuid,
  'color-sevenths',
  'Color sevenths',
  'Minor-major and augmented sevenths join the common seventh chords.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"color-sevenths","title":"Color sevenths","exerciseType":"chord-identification","qualities":["minorMajor7","augmented7","major7","dominant7"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:minorMajor7', 'chord:augmented7', 'chord:major7', 'chord:dominant7']::text[],
  90
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000001d'::uuid,
  'seventh-inversions',
  'Sevenths in inversion',
  'Major and dominant sevenths in every inversion.',
  'chord',
  'chords',
  4,
  80,
  10,
  '{"slug":"seventh-inversions","title":"Sevenths in inversion","exerciseType":"chord-identification","qualities":["major7","dominant7"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0,1,2,3],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major7', 'chord:dominant7']::text[],
  100
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000001e'::uuid,
  'visual-sixths',
  'Major and minor sixths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-sixths","title":"Major and minor sixths on the page","exerciseType":"visual-interval","intervals":["m6","M6"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m6', 'interval:M6']::text[],
  80
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000001f'::uuid,
  'visual-interval-sevenths',
  'Major and minor sevenths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-interval-sevenths","title":"Major and minor sevenths on the page","exerciseType":"visual-interval","intervals":["m7","M7"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m7', 'interval:M7']::text[],
  90
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000020'::uuid,
  'visual-tritone',
  'The tritone on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-tritone","title":"The tritone on the page","exerciseType":"visual-interval","intervals":["P4","A4","P5"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:P4', 'interval:A4', 'interval:P5']::text[],
  100
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000021'::uuid,
  'visual-ninths',
  'Major and minor ninths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-ninths","title":"Major and minor ninths on the page","exerciseType":"visual-interval","intervals":["m9","M9"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m9', 'interval:M9']::text[],
  110
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000022'::uuid,
  'visual-tenths',
  'Major and minor tenths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-tenths","title":"Major and minor tenths on the page","exerciseType":"visual-interval","intervals":["m10","M10"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m10', 'interval:M10']::text[],
  120
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000023'::uuid,
  'visual-compound-perfect',
  'Elevenths and twelfths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-compound-perfect","title":"Elevenths and twelfths on the page","exerciseType":"visual-interval","intervals":["P11","P12"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:P11', 'interval:P12']::text[],
  130
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000024'::uuid,
  'visual-thirteenths',
  'Major and minor thirteenths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-thirteenths","title":"Major and minor thirteenths on the page","exerciseType":"visual-interval","intervals":["m13","M13"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m13', 'interval:M13']::text[],
  140
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000025'::uuid,
  'visual-to-the-fifteenth',
  'To the fifteenth on the page',
  'Name it on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-to-the-fifteenth","title":"To the fifteenth on the page","exerciseType":"visual-interval","intervals":["m14","M14","P15"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m14', 'interval:M14', 'interval:P15']::text[],
  150
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000026'::uuid,
  'visual-triad-inversions',
  'Triads in inversion on the page',
  'Name it on the staff or on the lit keys.',
  'visual_chord',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-triad-inversions","title":"Triads in inversion on the page","exerciseType":"visual-chord","qualities":["major","minor"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0,1,2],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['chord:major', 'chord:minor']::text[],
  160
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000027'::uuid,
  'visual-open-triads',
  'Open triads on the page',
  'Name it on the staff or on the lit keys.',
  'visual_chord',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-open-triads","title":"Open triads on the page","exerciseType":"visual-chord","qualities":["major","minor","augmented","diminished"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["open"],"pitchRange":{"min":36,"max":96},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['chord:major', 'chord:minor', 'chord:augmented', 'chord:diminished']::text[],
  170
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000028'::uuid,
  'visual-major-dominant-sevenths',
  'Major and dominant sevenths on the page',
  'Name it on the staff or on the lit keys.',
  'visual_chord',
  'visual',
  4,
  80,
  10,
  '{"slug":"visual-major-dominant-sevenths","title":"Major and dominant sevenths on the page","exerciseType":"visual-chord","qualities":["major7","dominant7"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['chord:major7', 'chord:dominant7']::text[],
  180
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000029'::uuid,
  'cadence-major',
  'IV – I and V – I',
  'Two major cadences: the fourth degree to the tonic, and the fifth degree to the tonic.',
  'cadence',
  'cadences',
  1,
  0,
  10,
  '{"slug":"cadence-major","title":"IV – I and V – I","exerciseType":"cadence-identification","cadences":["plagalMajor","authenticMajor"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['cadence:plagalMajor', 'cadence:authenticMajor']::text[],
  10
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000002a'::uuid,
  'cadence-minor',
  'iv – i and V – i',
  'The same two families in a minor key. The dominant stays major.',
  'cadence',
  'cadences',
  2,
  40,
  10,
  '{"slug":"cadence-minor","title":"iv – i and V – i","exerciseType":"cadence-identification","cadences":["plagalMinor","authenticMinor"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['cadence:plagalMinor', 'cadence:authenticMinor']::text[],
  20
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000002b'::uuid,
  'cadence-seventh',
  'V7 – I',
  'The dominant seventh cadence beside a plain V – I.',
  'cadence',
  'cadences',
  3,
  60,
  10,
  '{"slug":"cadence-seventh","title":"V7 – I","exerciseType":"cadence-identification","cadences":["dominantSeventh","authenticMajor"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['cadence:dominantSeventh', 'cadence:authenticMajor']::text[],
  30
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000002c'::uuid,
  'cadence-sixth',
  'V6 – I',
  'The dominant in first inversion, beside root-position V – I.',
  'cadence',
  'cadences',
  4,
  80,
  10,
  '{"slug":"cadence-sixth","title":"V6 – I","exerciseType":"cadence-identification","cadences":["dominantSix","authenticMajor"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['cadence:dominantSix', 'cadence:authenticMajor']::text[],
  40
) on conflict (slug) do nothing;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000002d'::uuid,
  'cadence-on-the-staff',
  'Cadences on the staff',
  'Name a major cadence from the notes on the staff.',
  'cadence',
  'cadences',
  4,
  80,
  10,
  '{"slug":"cadence-on-the-staff","title":"Cadences on the staff","exerciseType":"visual-cadence","cadences":["plagalMajor","authenticMajor"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff"]}'::jsonb,
  array['cadence:plagalMajor', 'cadence:authenticMajor']::text[],
  50
) on conflict (slug) do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'through-the-octave'
where child.slug = 'sixths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'sixths'
where child.slug = 'interval-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'interval-sevenths'
where child.slug = 'tritone'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'tritone'
where child.slug = 'ninths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'ninths'
where child.slug = 'tenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'tenths'
where child.slug = 'compound-perfect'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'compound-perfect'
where child.slug = 'thirteenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'thirteenths'
where child.slug = 'to-the-fifteenth'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'four-triads'
where child.slug = 'triad-inversions'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'triad-inversions'
where child.slug = 'open-triads'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'open-triads'
where child.slug = 'major-dominant-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'major-dominant-sevenths'
where child.slug = 'minor-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'minor-sevenths'
where child.slug = 'diminished-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'diminished-sevenths'
where child.slug = 'color-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'color-sevenths'
where child.slug = 'seventh-inversions'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'sixths'
where child.slug = 'visual-sixths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-four-triads'
where child.slug = 'visual-sixths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'interval-sevenths'
where child.slug = 'visual-interval-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-sixths'
where child.slug = 'visual-interval-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'tritone'
where child.slug = 'visual-tritone'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-interval-sevenths'
where child.slug = 'visual-tritone'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'ninths'
where child.slug = 'visual-ninths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-tritone'
where child.slug = 'visual-ninths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'tenths'
where child.slug = 'visual-tenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-ninths'
where child.slug = 'visual-tenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'compound-perfect'
where child.slug = 'visual-compound-perfect'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-tenths'
where child.slug = 'visual-compound-perfect'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'thirteenths'
where child.slug = 'visual-thirteenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-compound-perfect'
where child.slug = 'visual-thirteenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'to-the-fifteenth'
where child.slug = 'visual-to-the-fifteenth'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-thirteenths'
where child.slug = 'visual-to-the-fifteenth'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'triad-inversions'
where child.slug = 'visual-triad-inversions'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-to-the-fifteenth'
where child.slug = 'visual-triad-inversions'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'open-triads'
where child.slug = 'visual-open-triads'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-triad-inversions'
where child.slug = 'visual-open-triads'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'major-dominant-sevenths'
where child.slug = 'visual-major-dominant-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-open-triads'
where child.slug = 'visual-major-dominant-sevenths'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'cadence-major'
where child.slug = 'cadence-minor'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'cadence-minor'
where child.slug = 'cadence-seventh'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'cadence-seventh'
where child.slug = 'cadence-sixth'
on conflict do nothing;

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'cadence-sixth'
where child.slug = 'cadence-on-the-staff'
on conflict do nothing;

