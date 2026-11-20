-- ════════════════════════════════════════════════════════════════
-- PeriodWise schema
-- Every table has Row Level Security. Users can only touch their own
-- rows; educational content is public read-only; feedback is
-- insert-only for the public.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── profiles ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text check (char_length(display_name) <= 60),
  avatar_url        text,
  date_of_birth     date,
  age_group         text check (age_group in ('under-13', '13-17', '18-24', '25-34', '35-44', '45+')),
  avg_cycle_length  int  not null default 28 check (avg_cycle_length between 15 and 60),
  avg_period_length int  not null default 5  check (avg_period_length between 1 and 15),
  onboarding_done   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── cycles (one row per period) ───────────────────────────────────
create table if not exists public.cycles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null,
  end_date   date,
  notes      text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint cycles_end_after_start check (end_date is null or end_date >= start_date),
  constraint cycles_unique_start unique (user_id, start_date)
);
create index if not exists cycles_user_start_idx on public.cycles (user_id, start_date desc);

-- ── daily_logs ────────────────────────────────────────────────────
create table if not exists public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null,
  flow          text not null default 'none' check (flow in ('none', 'spotting', 'light', 'medium', 'heavy')),
  symptoms      text[] not null default '{}',
  mood          text check (mood in ('happy', 'calm', 'sensitive', 'sad', 'irritable', 'anxious')),
  energy        int check (energy between 1 and 5),
  pain_level    int check (pain_level between 0 and 10),
  water_glasses int check (water_glasses between 0 and 30),
  sleep_hours   numeric(3, 1) check (sleep_hours between 0 and 24),
  notes         text check (char_length(notes) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint daily_logs_unique_day unique (user_id, date)
);
create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, date desc);

-- ── content: articles, myths, quiz ────────────────────────────────
create table if not exists public.articles (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  position  int not null,
  letter    text not null,
  nav_label text not null,
  title     text not null,
  summary   text not null,
  body      jsonb not null default '[]'
);

create table if not exists public.myths (
  id       serial primary key,
  myth     text not null,
  fact     text not null,
  category text not null,
  source   text
);

create table if not exists public.quiz_questions (
  id            serial primary key,
  position      int not null unique,
  question      text not null,
  options       text[] not null check (array_length(options, 1) between 2 and 6),
  correct_index int not null,
  explanation   text not null
);

-- ── quiz_attempts ─────────────────────────────────────────────────
-- session_stage lets awareness campaigns compare scores before vs after a session.
create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  session_stage text not null default 'exploring' check (session_stage in ('exploring', 'before', 'after')),
  score         int,
  total         int not null default 10,
  answers       jsonb not null default '[]',
  completed     boolean not null default false,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);

-- ── feedback (anonymous allowed) ──────────────────────────────────
create table if not exists public.feedback (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid default auth.uid() references auth.users (id) on delete set null,
  usefulness           text not null check (usefulness in ('very', 'somewhat', 'not-really')),
  learned_something_new boolean not null,
  most_useful_section  text check (most_useful_section in ('tracker', 'calendar', 'learn', 'myths', 'quiz', 'insights')),
  topic_request        text check (char_length(topic_request) <= 200),
  rating               int not null check (rating between 1 and 5),
  comments             text check (char_length(comments) <= 2000),
  created_at           timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- Triggers
-- ════════════════════════════════════════════════════════════════
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists daily_logs_touch on public.daily_logs;
create trigger daily_logs_touch before update on public.daily_logs
  for each row execute function public.touch_updated_at();

-- Auto-create a profile for every new auth user (email or Google).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name',
                  new.raw_user_meta_data ->> 'full_name',
                  new.raw_user_meta_data ->> 'name',
                  split_part(new.email, '@', 1)), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.cycles         enable row level security;
alter table public.daily_logs     enable row level security;
alter table public.articles       enable row level security;
alter table public.myths          enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts  enable row level security;
alter table public.feedback       enable row level security;

-- profiles: own row only
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

-- cycles + daily_logs: full CRUD on own rows only
drop policy if exists "cycles: own rows" on public.cycles;
create policy "cycles: own rows" on public.cycles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "daily_logs: own rows" on public.daily_logs;
create policy "daily_logs: own rows" on public.daily_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- content: public read-only (no write policies → writes are denied)
drop policy if exists "articles: public read" on public.articles;
create policy "articles: public read" on public.articles for select to anon, authenticated using (true);
drop policy if exists "myths: public read" on public.myths;
create policy "myths: public read" on public.myths for select to anon, authenticated using (true);
drop policy if exists "quiz_questions: public read" on public.quiz_questions;
create policy "quiz_questions: public read" on public.quiz_questions for select to anon, authenticated using (true);

-- quiz_attempts: users read their own history; writes go through RPCs below
drop policy if exists "quiz_attempts: read own" on public.quiz_attempts;
create policy "quiz_attempts: read own" on public.quiz_attempts for select to authenticated using ((select auth.uid()) = user_id);

-- feedback: insert-only for everyone; nobody can read others' feedback via the API
drop policy if exists "feedback: anyone can submit" on public.feedback;
create policy "feedback: anyone can submit" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- ════════════════════════════════════════════════════════════════
-- RPCs
-- ════════════════════════════════════════════════════════════════

-- Start a quiz attempt (anonymous or signed in). Returns its id.
create or replace function public.start_quiz_attempt(p_stage text default 'exploring')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_stage not in ('exploring', 'before', 'after') then p_stage := 'exploring'; end if;
  insert into public.quiz_attempts (user_id, session_stage) values (auth.uid(), p_stage) returning id into v_id;
  return v_id;
end $$;

-- Finish an attempt. Only the same user (or an anonymous attempt) can finish it, once.
create or replace function public.finish_quiz_attempt(p_id uuid, p_score int, p_total int, p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quiz_attempts
     set score = greatest(0, least(p_score, p_total)),
         total = p_total,
         answers = coalesce(p_answers, '[]'),
         completed = true,
         finished_at = now()
   where id = p_id
     and completed = false
     and (user_id is null or user_id = auth.uid());
end $$;

-- Aggregate, anonymous campaign stats for the Home page. Never exposes rows.
create or replace function public.get_campaign_stats()
returns json language sql stable security definer set search_path = '' as $$
  with a as (select * from public.quiz_attempts),
       c as (select * from a where completed and total > 0)
  select json_build_object(
    'participants',       (select count(distinct coalesce(user_id::text, id::text)) from a),
    'attempts_started',   (select count(*) from a),
    'attempts_completed', (select count(*) from c),
    'completion_rate',    coalesce((select round(100.0 * count(*) filter (where completed) / nullif(count(*), 0)) from a), 0),
    'avg_score_pct',      coalesce((select round(avg(100.0 * score / total)) from c), 0),
    'before_avg_pct',     (select round(avg(100.0 * score / total)) from c where session_stage = 'before'),
    'after_avg_pct',      (select round(avg(100.0 * score / total)) from c where session_stage = 'after'),
    'feedback_count',     (select count(*) from public.feedback),
    'learned_new_pct',    (select round(100.0 * count(*) filter (where learned_something_new) / nullif(count(*), 0)) from public.feedback)
  );
$$;

-- Permanently delete the signed-in user and (via cascade) all their data.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.start_quiz_attempt(text) to anon, authenticated;
grant execute on function public.finish_quiz_attempt(uuid, int, int, jsonb) to anon, authenticated;
grant execute on function public.get_campaign_stats() to anon, authenticated;
