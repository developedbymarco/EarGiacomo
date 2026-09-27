-- EarGiacomo guided path.
-- Run this in the Supabase SQL editor after the profiles migration.
-- Lesson rows are seeded from src/lib/curriculum/seed.ts.
-- Clients can read the catalog and their own progress. They cannot write mastery.
-- Passing a free lesson (at least 80 percent) opens the next lesson. Unlock prices stay at 0 until Giacominos.

create table public.curriculum_nodes (
  id uuid primary key,
  slug text not null unique,
  title text not null,
  description text,
  category text not null,
  path text not null,
  difficulty integer not null default 1,
  unlock_cost integer not null default 0,
  xp_reward integer not null default 0,
  config jsonb not null,
  concepts text[] not null,
  is_active boolean not null default true,
  sort_order integer not null,
  constraint curriculum_nodes_category check (
    category in ('interval', 'chord', 'visual_interval', 'visual_chord', 'cadence')
  ),
  constraint curriculum_nodes_path check (path in ('intervals', 'chords', 'visual', 'cadences')),
  constraint curriculum_nodes_concepts check (cardinality(concepts) > 0)
);

create table public.curriculum_prerequisites (
  node_id uuid not null references public.curriculum_nodes (id) on delete cascade,
  prerequisite_node_id uuid not null references public.curriculum_nodes (id) on delete cascade,
  primary key (node_id, prerequisite_node_id),
  constraint curriculum_prerequisites_no_self check (node_id <> prerequisite_node_id)
);

create table public.user_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id uuid not null references public.curriculum_nodes (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  cost_paid integer not null default 0,
  primary key (user_id, node_id)
);

create table public.user_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept_key text not null,
  mastery numeric not null default 0,
  attempts integer not null default 0,
  correct integer not null default 0,
  last_practiced_at timestamptz,
  last_correct boolean not null default false,
  confusion_map jsonb not null default '{}'::jsonb,
  primary key (user_id, concept_key),
  constraint user_mastery_range check (mastery >= 0 and mastery <= 100),
  constraint user_mastery_counts check (attempts >= 0 and correct >= 0 and correct <= attempts)
);

create table public.practice_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  node_id uuid references public.curriculum_nodes (id),
  question_count integer not null,
  correct_count integer not null,
  xp_earned integer not null default 0,
  giacominos_earned integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  client_token text not null unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint practice_sessions_mode check (mode in ('practice', 'guided', 'review')),
  constraint practice_sessions_counts check (
    question_count > 0 and correct_count >= 0 and correct_count <= question_count
  )
);

create index practice_sessions_user_node_idx on public.practice_sessions (user_id, node_id);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_type text not null,
  stimulus jsonb not null default '{}'::jsonb,
  correct_answer jsonb not null,
  user_answer jsonb not null,
  is_correct boolean not null,
  response_time_ms integer,
  repeat_count integer not null default 0,
  concept_key text not null,
  created_at timestamptz not null default now()
);

alter table public.curriculum_nodes enable row level security;
alter table public.curriculum_prerequisites enable row level security;
alter table public.user_unlocks enable row level security;
alter table public.user_mastery enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.question_attempts enable row level security;

create policy curriculum_nodes_read on public.curriculum_nodes
  for select to anon, authenticated using (is_active);

create policy curriculum_prerequisites_read on public.curriculum_prerequisites
  for select to anon, authenticated using (true);

create policy user_unlocks_read_own on public.user_unlocks
  for select to authenticated using (user_id = auth.uid());

create policy user_mastery_read_own on public.user_mastery
  for select to authenticated using (user_id = auth.uid());

create policy practice_sessions_read_own on public.practice_sessions
  for select to authenticated using (user_id = auth.uid());

create policy question_attempts_read_own on public.question_attempts
  for select to authenticated using (user_id = auth.uid());

revoke all on public.curriculum_nodes from anon, authenticated;
grant select on public.curriculum_nodes to anon, authenticated;

revoke all on public.curriculum_prerequisites from anon, authenticated;
grant select on public.curriculum_prerequisites to anon, authenticated;

revoke all on public.user_unlocks from anon, authenticated;
grant select on public.user_unlocks to authenticated;

revoke all on public.user_mastery from anon, authenticated;
grant select on public.user_mastery to authenticated;

revoke all on public.practice_sessions from anon, authenticated;
grant select on public.practice_sessions to authenticated;

revoke all on public.question_attempts from anon, authenticated;
grant select on public.question_attempts to authenticated;

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
  total integer := 0;
  correct_count integer := 0;
  session_id uuid;
  passed boolean := false;
  prereq_ok boolean;
  unlocked_slugs text[] := array[]::text[];
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
    if concept !~ '^(interval|chord):[A-Za-z0-9]+$' or chosen !~ '^(interval|chord):[A-Za-z0-9]+$' then
      raise exception 'invalid_concept';
    end if;
    total := total + 1;
    if coalesce((element->>'correct')::boolean, false) then
      correct_count := correct_count + 1;
    end if;
  end loop;

  if p_mode = 'guided' and p_node_slug is not null then
    select id into node from public.curriculum_nodes where slug = p_node_slug and is_active;
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
    if not prereq_ok then
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
      session_id,
      uid,
      p_mode,
      node,
      total,
      correct_count,
      0,
      0,
      jsonb_build_object('nodeSlug', p_node_slug),
      p_token,
      now()
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
      'unlocked', '[]'::jsonb
    );
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
      session_id,
      uid,
      split_part(concept, ':', 1),
      jsonb_build_object('conceptKey', concept),
      jsonb_build_object('conceptKey', concept),
      jsonb_build_object('conceptKey', chosen),
      was_correct,
      repeats,
      concept
    );
  end loop;

  if p_mode = 'guided' and node is not null and correct_count * 5 >= total * 4 then
    passed := true;
    for dep in
      select n.id, n.slug, n.unlock_cost
      from public.curriculum_nodes n
      join public.curriculum_prerequisites cp on cp.node_id = n.id and cp.prerequisite_node_id = node
    loop
      if dep.unlock_cost > 0 then
        continue;
      end if;
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
      insert into public.user_unlocks (user_id, node_id, cost_paid)
      values (uid, dep.id, 0)
      on conflict do nothing;
      unlocked_slugs := array_append(unlocked_slugs, dep.slug);
    end loop;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'passed', passed,
    'correct', correct_count,
    'total', total,
    'unlocked', to_jsonb(unlocked_slugs)
  );
end;
$$;

revoke all on function public.record_practice_result(text, text, text, jsonb) from public, anon;
grant execute on function public.record_practice_result(text, text, text, jsonb) to authenticated;

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000001'::uuid,
  'seconds',
  'Major and minor seconds',
  'Tell a minor second from a major second by ear.',
  'interval',
  'intervals',
  1,
  0,
  10,
  '{"slug":"seconds","title":"Major and minor seconds","exerciseType":"interval-identification","intervals":["m2","M2"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2', 'interval:M2']::text[],
  10
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000002'::uuid,
  'thirds',
  'Major and minor thirds',
  'Tell a minor third from a major third by ear.',
  'interval',
  'intervals',
  2,
  0,
  10,
  '{"slug":"thirds","title":"Major and minor thirds","exerciseType":"interval-identification","intervals":["m3","M3"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m3', 'interval:M3']::text[],
  20
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000003'::uuid,
  'seconds-and-thirds',
  'Seconds and thirds',
  'The four intervals, mixed.',
  'interval',
  'intervals',
  3,
  0,
  10,
  '{"slug":"seconds-and-thirds","title":"Seconds and thirds","exerciseType":"interval-identification","intervals":["m2","M2","m3","M3"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2', 'interval:M2', 'interval:m3', 'interval:M3']::text[],
  30
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000004'::uuid,
  'through-the-octave',
  'Through the octave',
  'Add the perfect fourth, fifth, and octave.',
  'interval',
  'intervals',
  4,
  0,
  10,
  '{"slug":"through-the-octave","title":"Through the octave","exerciseType":"interval-identification","intervals":["m2","M2","m3","M3","P4","P5","P8"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2', 'interval:M2', 'interval:m3', 'interval:M3', 'interval:P4', 'interval:P5', 'interval:P8']::text[],
  40
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000005'::uuid,
  'major-minor-triads',
  'Major and minor triads',
  'Root-position major and minor triads.',
  'chord',
  'chords',
  1,
  0,
  10,
  '{"slug":"major-minor-triads","title":"Major and minor triads","exerciseType":"chord-identification","qualities":["major","minor"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major', 'chord:minor']::text[],
  10
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000006'::uuid,
  'add-augmented',
  'Add augmented',
  'Augmented joins major and minor.',
  'chord',
  'chords',
  2,
  0,
  10,
  '{"slug":"add-augmented","title":"Add augmented","exerciseType":"chord-identification","qualities":["major","minor","augmented"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major', 'chord:minor', 'chord:augmented']::text[],
  20
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000007'::uuid,
  'four-triads',
  'Four triads',
  'Diminished joins the other three triads.',
  'chord',
  'chords',
  3,
  0,
  10,
  '{"slug":"four-triads","title":"Four triads","exerciseType":"chord-identification","qualities":["major","minor","augmented","diminished"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major', 'chord:minor', 'chord:augmented', 'chord:diminished']::text[],
  30
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000008'::uuid,
  'visual-seconds',
  'Seconds on the page',
  'Name seconds on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  1,
  0,
  10,
  '{"slug":"visual-seconds","title":"Seconds on the page","exerciseType":"visual-interval","intervals":["m2","M2"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m2', 'interval:M2']::text[],
  10
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-000000000009'::uuid,
  'visual-thirds',
  'Thirds on the page',
  'Name thirds on the staff or on the lit keys.',
  'visual_interval',
  'visual',
  2,
  0,
  10,
  '{"slug":"visual-thirds","title":"Thirds on the page","exerciseType":"visual-interval","intervals":["m3","M3"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m3', 'interval:M3']::text[],
  20
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000000a'::uuid,
  'visual-seconds-and-thirds',
  'Seconds and thirds on the page',
  'The four intervals, seen rather than heard.',
  'visual_interval',
  'visual',
  3,
  0,
  10,
  '{"slug":"visual-seconds-and-thirds","title":"Seconds and thirds on the page","exerciseType":"visual-interval","intervals":["m2","M2","m3","M3"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m2', 'interval:M2', 'interval:m3', 'interval:M3']::text[],
  30
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000000b'::uuid,
  'visual-through-the-octave',
  'Through the octave on the page',
  'Fourths, fifths, and octaves, on the staff or the keys.',
  'visual_interval',
  'visual',
  4,
  0,
  10,
  '{"slug":"visual-through-the-octave","title":"Through the octave on the page","exerciseType":"visual-interval","intervals":["m2","M2","m3","M3","P4","P5","P8"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":84},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['interval:m2', 'interval:M2', 'interval:m3', 'interval:M3', 'interval:P4', 'interval:P5', 'interval:P8']::text[],
  40
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000000c'::uuid,
  'visual-major-minor',
  'Triads on the page',
  'Major and minor triads, written or lit.',
  'visual_chord',
  'visual',
  2,
  0,
  10,
  '{"slug":"visual-major-minor","title":"Triads on the page","exerciseType":"visual-chord","qualities":["major","minor"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['chord:major', 'chord:minor']::text[],
  50
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000000d'::uuid,
  'visual-augmented',
  'Augmented on the page',
  'Augmented joins major and minor, on the staff or the keys.',
  'visual_chord',
  'visual',
  3,
  0,
  10,
  '{"slug":"visual-augmented","title":"Augmented on the page","exerciseType":"visual-chord","qualities":["major","minor","augmented"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['chord:major', 'chord:minor', 'chord:augmented']::text[],
  60
);
insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  'c1000001-0000-4000-8000-00000000000e'::uuid,
  'visual-four-triads',
  'Four triads on the page',
  'All four triads, seen rather than heard.',
  'visual_chord',
  'visual',
  4,
  0,
  10,
  '{"slug":"visual-four-triads","title":"Four triads on the page","exerciseType":"visual-chord","qualities":["major","minor","augmented","diminished"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["staff","piano"]}'::jsonb,
  array['chord:major', 'chord:minor', 'chord:augmented', 'chord:diminished']::text[],
  70
);
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds'
where child.slug = 'thirds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'thirds'
where child.slug = 'seconds-and-thirds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds-and-thirds'
where child.slug = 'through-the-octave';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'major-minor-triads'
where child.slug = 'add-augmented';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'add-augmented'
where child.slug = 'four-triads';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds'
where child.slug = 'visual-seconds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'thirds'
where child.slug = 'visual-thirds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-seconds'
where child.slug = 'visual-thirds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds-and-thirds'
where child.slug = 'visual-seconds-and-thirds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-thirds'
where child.slug = 'visual-seconds-and-thirds';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'through-the-octave'
where child.slug = 'visual-through-the-octave';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-seconds-and-thirds'
where child.slug = 'visual-through-the-octave';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'major-minor-triads'
where child.slug = 'visual-major-minor';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-through-the-octave'
where child.slug = 'visual-major-minor';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'add-augmented'
where child.slug = 'visual-augmented';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-major-minor'
where child.slug = 'visual-augmented';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'four-triads'
where child.slug = 'visual-four-triads';
insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'visual-augmented'
where child.slug = 'visual-four-triads';
