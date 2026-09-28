-- EarGiacomo presentation lessons.
-- Run this in the Supabase SQL editor after the round payout migration.
-- Listening lessons build from ascending, to descending, to melodic, to harmonic, then mixed.

update public.curriculum_nodes
set title = 'Seconds, ascending',
    description = 'Minor and major seconds. The low note sounds, then the high note.',
    config = config || jsonb_build_object('title', 'Seconds, ascending', 'presentation', jsonb_build_array('ascending'))
where slug = 'seconds';

update public.curriculum_nodes
set title = 'Triads, ascending',
    description = 'Major and minor triads, notes from the bottom upward.',
    config = config || jsonb_build_object('title', 'Triads, ascending', 'presentation', jsonb_build_array('melodicAscending'))
where slug = 'major-minor-triads';

insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values
(
  'c1000001-0000-4000-8000-000000000101',
  'seconds-descending',
  'Seconds, descending',
  'The same seconds. The high note sounds, then the low note.',
  'interval', 'intervals', 1, 0, 10,
  '{"slug":"seconds-descending","title":"Seconds, descending","exerciseType":"interval-identification","intervals":["m2","M2"],"presentation":["descending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2','interval:M2'],
  12
),
(
  'c1000001-0000-4000-8000-000000000102',
  'seconds-melodic',
  'Seconds, melodic',
  'One note after the other, sometimes rising and sometimes falling.',
  'interval', 'intervals', 1, 0, 10,
  '{"slug":"seconds-melodic","title":"Seconds, melodic","exerciseType":"interval-identification","intervals":["m2","M2"],"presentation":["ascending","descending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2','interval:M2'],
  14
),
(
  'c1000001-0000-4000-8000-000000000103',
  'seconds-harmonic',
  'Seconds, harmonic',
  'Both notes at the same time.',
  'interval', 'intervals', 1, 0, 10,
  '{"slug":"seconds-harmonic","title":"Seconds, harmonic","exerciseType":"interval-identification","intervals":["m2","M2"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2','interval:M2'],
  16
),
(
  'c1000001-0000-4000-8000-000000000104',
  'seconds-mixed',
  'Seconds, mixed',
  'Ascending, descending, and harmonic, in one round.',
  'interval', 'intervals', 1, 0, 10,
  '{"slug":"seconds-mixed","title":"Seconds, mixed","exerciseType":"interval-identification","intervals":["m2","M2"],"presentation":["ascending","descending","harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['interval:m2','interval:M2'],
  18
),
(
  'c1000001-0000-4000-8000-000000000105',
  'triads-descending',
  'Triads, descending',
  'The same triads, notes from the top downward.',
  'chord', 'chords', 1, 0, 10,
  '{"slug":"triads-descending","title":"Triads, descending","exerciseType":"chord-identification","qualities":["major","minor"],"presentation":["melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major','chord:minor'],
  12
),
(
  'c1000001-0000-4000-8000-000000000106',
  'triads-melodic',
  'Triads, melodic',
  'Notes one after another, rising or falling.',
  'chord', 'chords', 1, 0, 10,
  '{"slug":"triads-melodic","title":"Triads, melodic","exerciseType":"chord-identification","qualities":["major","minor"],"presentation":["melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major','chord:minor'],
  14
),
(
  'c1000001-0000-4000-8000-000000000107',
  'triads-harmonic',
  'Triads, harmonic',
  'All three notes at the same time.',
  'chord', 'chords', 1, 0, 10,
  '{"slug":"triads-harmonic","title":"Triads, harmonic","exerciseType":"chord-identification","qualities":["major","minor"],"presentation":["harmonic"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major','chord:minor'],
  16
),
(
  'c1000001-0000-4000-8000-000000000108',
  'triads-mixed',
  'Triads, mixed',
  'Ascending, descending, and harmonic, in one round.',
  'chord', 'chords', 1, 0, 10,
  '{"slug":"triads-mixed","title":"Triads, mixed","exerciseType":"chord-identification","qualities":["major","minor"],"presentation":["harmonic","melodicAscending","melodicDescending"],"inversions":[0],"voicing":["closed"],"pitchRange":{"min":48,"max":72},"questions":10,"stimulus":["audio"]}'::jsonb,
  array['chord:major','chord:minor'],
  18
);

delete from public.curriculum_prerequisites cp
using public.curriculum_nodes child, public.curriculum_nodes parent
where cp.node_id = child.id
  and cp.prerequisite_node_id = parent.id
  and parent.slug = 'seconds'
  and child.slug = 'thirds';

delete from public.curriculum_prerequisites cp
using public.curriculum_nodes child, public.curriculum_nodes parent
where cp.node_id = child.id
  and cp.prerequisite_node_id = parent.id
  and parent.slug = 'major-minor-triads'
  and child.slug = 'add-augmented';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds'
where child.slug = 'seconds-descending';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds-descending'
where child.slug = 'seconds-melodic';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds-melodic'
where child.slug = 'seconds-harmonic';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds-harmonic'
where child.slug = 'seconds-mixed';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'seconds-mixed'
where child.slug = 'thirds';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'major-minor-triads'
where child.slug = 'triads-descending';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'triads-descending'
where child.slug = 'triads-melodic';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'triads-melodic'
where child.slug = 'triads-harmonic';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'triads-harmonic'
where child.slug = 'triads-mixed';

insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = 'triads-mixed'
where child.slug = 'add-augmented';

insert into public.user_unlocks (user_id, node_id, cost_paid)
select distinct s.user_id, child.id, 0
from public.practice_sessions s
join public.curriculum_nodes parent on parent.id = s.node_id
join public.curriculum_nodes child on child.slug = case parent.slug
  when 'seconds' then 'seconds-descending'
  when 'major-minor-triads' then 'triads-descending'
end
where parent.slug in ('seconds', 'major-minor-triads')
  and s.mode = 'guided'
  and s.completed_at is not null
  and s.question_count > 0
  and s.correct_count * 5 >= s.question_count * 4
on conflict do nothing;

notify pgrst, 'reload schema';
