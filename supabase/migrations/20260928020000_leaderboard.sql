-- EarGiacomo public Ear Rating.
-- Run this in the Supabase SQL editor after the presentation lessons migration.
-- The last 100 answers, weighted by concept difficulty. Giacominos are not used.
-- A row appears when the profile is public, accuracy is visible, and the player leaves the board on.

alter table public.profiles
  add column if not exists show_on_leaderboard boolean not null default true;

grant update (show_on_leaderboard) on table public.profiles to authenticated;

create index if not exists question_attempts_user_recent_idx
  on public.question_attempts (user_id, created_at desc);

create or replace function public.leaderboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select
      qa.user_id,
      qa.concept_key,
      qa.is_correct,
      row_number() over (partition by qa.user_id order by qa.created_at desc, qa.id desc) as n
    from public.question_attempts qa
  ),
  windowed as (
    select user_id, concept_key, is_correct
    from recent
    where n <= 100
  ),
  difficulty as (
    select concept, greatest(min(n.difficulty), 1) as difficulty
    from public.curriculum_nodes n
    cross join lateral unnest(n.concepts) as concept
    where n.is_active
    group by concept
  ),
  scored as (
    select
      w.user_id,
      count(*)::int as answers,
      round(
        1000.0 * sum((case when w.is_correct then 1 else 0 end) * coalesce(d.difficulty, 1))
        / sum(coalesce(d.difficulty, 1))
      )::int as rating
    from windowed w
    left join difficulty d on d.concept = w.concept_key
    group by w.user_id
    having count(*) >= 10
  ),
  visible as (
    select
      s.user_id,
      s.answers,
      s.rating,
      p.username,
      p.display_name,
      rank() over (order by s.rating desc, s.answers desc, p.username) as place
    from scored s
    join public.profiles p on p.id = s.user_id
    where p.profile_visibility = 'public'
      and p.show_accuracy
      and p.show_on_leaderboard
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'place', v.place,
          'username', v.username,
          'displayName', v.display_name,
          'rating', v.rating,
          'answers', v.answers
        )
        order by v.place
      )
      from visible v
      where v.place <= 50
    ), '[]'::jsonb),
    'you', (
      select case
        when auth.uid() is null then null
        else jsonb_build_object(
          'rating', s.rating,
          'answers', coalesce(s.answers, (select count(*)::int from windowed w where w.user_id = auth.uid())),
          'place', v.place,
          'listed', v.user_id is not null,
          'reason', case
            when coalesce(s.answers, 0) < 10 then 'short'
            when p.profile_visibility is distinct from 'public' then 'private'
            when p.show_accuracy is not true then 'accuracy'
            when p.show_on_leaderboard is not true then 'hidden'
            else null
          end
        )
      end
      from public.profiles p
      left join scored s on s.user_id = p.id
      left join visible v on v.user_id = p.id
      where p.id = auth.uid()
    )
  );
$$;

revoke all on function public.leaderboard() from public;
grant execute on function public.leaderboard() to anon, authenticated;

notify pgrst, 'reload schema';
