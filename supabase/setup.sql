-- PeriodWise: one-shot setup (schema + seed). Safe to re-run.
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.

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

-- Generated by scripts/gen-seed.ts — do not edit by hand.

truncate public.articles, public.myths, public.quiz_questions restart identity;

insert into public.articles (slug, position, letter, nav_label, title, summary, body) values ('what-is-it', 1, 'A', 'What is it?', 'What is menstruation?', 'A normal, healthy part of the reproductive system — not an illness.', '[{"type":"p","text":"Menstruation (a “period”) is when the lining of the uterus sheds and leaves the body as blood through the vagina. It happens roughly once a month for people with a uterus, usually starting between ages 10 and 16 and continuing until menopause, typically around 45–55."},{"type":"p","text":"Each month the body prepares the uterine lining for a possible pregnancy. If no pregnancy happens, hormone levels drop and the lining is released. The blood you see is a mix of blood, tissue and mucus — and its colour can range from bright red to dark brown, which is normal."},{"type":"tip","text":"The first period is called menarche. Cycles are often irregular for the first 1–2 years — that is expected."}]'::jsonb);
insert into public.articles (slug, position, letter, nav_label, title, summary, body) values ('the-cycle', 2, 'B', 'The Cycle', 'Understanding the menstrual cycle', 'Counted from day 1 of one period to day 1 of the next.', '[{"type":"p","text":"The menstrual cycle is counted from the first day of one period to the first day of the next. A “typical” cycle is often described as 28 days, but anywhere from about 21 to 35 days is common and normal in adults (21–45 days in teens). The cycle has four broad phases:"},{"type":"ul","items":[{"title":"Menstrual phase","text":"the uterine lining sheds (your period), typically 3–7 days."},{"title":"Follicular phase","text":"oestrogen rises and follicles in the ovary mature; the lining starts to rebuild."},{"title":"Ovulation","text":"an egg is released, usually about 14 days before the next period. This is the most fertile time."},{"title":"Luteal phase","text":"progesterone rises to support a possible pregnancy. If none occurs, hormones drop and the next period begins."}]},{"type":"tip","text":"Tracking for 3 or more cycles gives a much more reliable picture of your own pattern than any “average”."}]'::jsonb);
insert into public.articles (slug, position, letter, nav_label, title, summary, body) values ('hygiene', 3, 'C', 'Hygiene', 'Menstrual hygiene basics', 'Small, consistent habits that keep you comfortable and reduce infection risk.', '[{"type":"ul","items":[{"title":"Change regularly","text":"change pads every 4–6 hours, tampons every 4–8 hours (never more than 8), and empty a cup every 8–12 hours."},{"title":"Wash your hands","text":"before and after changing any product."},{"title":"Keep it simple","text":"wash the outer genital area with plain water or a mild, unscented wash. The vagina cleans itself — douching is not needed and can cause irritation."},{"title":"Dispose safely","text":"wrap used pads or tampons in paper or their wrapper and put them in a bin. Never flush them."},{"title":"Wear breathable underwear","text":"cotton underwear helps keep the area dry and comfortable."}]},{"type":"warn","text":"Toxic shock syndrome (TSS) is rare but serious and linked to leaving tampons in too long. Seek urgent care for sudden high fever, rash, vomiting or dizziness while using a tampon."}]'::jsonb);
insert into public.articles (slug, position, letter, nav_label, title, summary, body) values ('products', 4, 'D', 'Products', 'Choosing a product', 'Pads, tampons, cups and period underwear all work — pick what suits you.', '[{"type":"ul","items":[{"title":"Pads","text":"stick to underwear, easy to use and widely available. Good for beginners and for overnight."},{"title":"Tampons","text":"worn inside the vagina; good for sport and swimming. Use the lowest absorbency you need."},{"title":"Menstrual cups","text":"reusable silicone cups that collect blood. Low cost over time and less waste; can be worn up to 12 hours."},{"title":"Period underwear","text":"washable underwear with an absorbent layer — comfortable and reusable."},{"title":"Cloth pads","text":"reusable and affordable; wash in soap and water and dry fully in sunlight."}]},{"type":"tip","text":"The “right” product depends on your flow, comfort, budget and lifestyle. Many people use more than one."}]'::jsonb);
insert into public.articles (slug, position, letter, nav_label, title, summary, body) values ('healthy-habits', 5, 'E', 'Healthy Habits', 'Healthy habits through your cycle', 'Food, movement, sleep and water all make periods easier.', '[{"type":"ul","items":[{"title":"Eat iron-rich foods","text":"lentils, beans, leafy greens, jaggery and meat help replace iron lost in blood. Pair them with vitamin C (citrus, amla) to absorb more."},{"title":"Stay hydrated","text":"water can reduce bloating and headaches."},{"title":"Keep moving","text":"light exercise like walking, yoga or cycling can ease cramps and lift mood."},{"title":"Prioritise sleep","text":"7–9 hours helps hormones and mood stay steady."},{"title":"Limit salt, sugar and caffeine","text":"especially in the luteal phase, to reduce bloating and irritability."}]}]'::jsonb);
insert into public.articles (slug, position, letter, nav_label, title, summary, body) values ('pain-symptoms', 6, 'F', 'Pain & Symptoms', 'Pain, PMS and when to see a doctor', 'Some discomfort is common. Pain that stops your life is not.', '[{"type":"p","text":"Cramps (dysmenorrhoea) happen when the uterus contracts to shed its lining. Many people also notice PMS a few days before their period: bloating, breast tenderness, acne, tiredness or mood changes."},{"type":"ul","items":[{"title":"Heat","text":"a hot water bottle on the lower belly relaxes muscles."},{"title":"Movement and stretching","text":"gentle activity improves blood flow."},{"title":"Pain relief","text":"over-the-counter options like ibuprofen can help — follow the label and ask a pharmacist if unsure."}]},{"type":"warn","text":"See a doctor if pain stops you from going to school or work, periods last longer than 7 days, you soak a pad or tampon every 1–2 hours, cycles are regularly shorter than 21 or longer than 35 days, or periods stop for 3+ months without pregnancy. Conditions like PCOS and endometriosis are common and treatable."}]'::jsonb);

insert into public.myths (myth, fact, category, source) values ('You shouldn''t exercise during your period.', 'Exercise is safe and often helps — it can ease cramps, lift mood and reduce bloating. Listen to your body and go gentler if you need to.', 'Lifestyle', 'NHS');
insert into public.myths (myth, fact, category, source) values ('Periods are impure or dirty.', 'Menstrual blood is a normal body fluid, not “dirty”. Periods are a sign of a healthy reproductive system, and no one should be excluded from daily life because of them.', 'Culture', 'UNICEF');
insert into public.myths (myth, fact, category, source) values ('You can''t get pregnant during your period.', 'It is less likely but possible — sperm can survive up to 5 days, and with a short cycle ovulation can happen soon after a period ends.', 'Body', 'ACOG');
insert into public.myths (myth, fact, category, source) values ('PMS is not a real thing — it’s “just in your head.”', 'PMS is real. Hormone changes in the luteal phase can cause physical and emotional symptoms in a large share of people who menstruate.', 'Body', 'Office on Women’s Health');
insert into public.myths (myth, fact, category, source) values ('You should not shower or wash your hair during your period.', 'Bathing is safe and recommended. Warm water can even ease cramps. Good hygiene during periods helps prevent infection.', 'Hygiene', 'WHO');
insert into public.myths (myth, fact, category, source) values ('A regular 28-day cycle is “normal” for everyone.', 'Only a minority of people have exactly 28-day cycles. Anywhere from 21 to 35 days is normal in adults, and teens often vary more.', 'Body', 'ACOG');
insert into public.myths (myth, fact, category, source) values ('Using tampons affects virginity.', 'Virginity is a social idea, not a medical one. Tampons and cups do not change it, and the hymen can stretch from many everyday activities.', 'Products', 'Planned Parenthood');
insert into public.myths (myth, fact, category, source) values ('You lose a large amount of blood during a period.', 'A typical period loses about 30–40 ml of blood in total — roughly 2–3 tablespoons. Soaking a pad every 1–2 hours is heavy and worth checking with a doctor.', 'Body', 'NHS');
insert into public.myths (myth, fact, category, source) values ('Menstrual cups are unsafe or only for older people.', 'Cups are safe for most people of any age once they learn how to use them. They come in different sizes, including smaller ones for teens.', 'Products', 'The Lancet Public Health');
insert into public.myths (myth, fact, category, source) values ('You should not enter the kitchen or touch pickles during a period.', 'There is no scientific basis for this. Periods do not spoil food or affect anything a person touches.', 'Culture', 'UNICEF');
insert into public.myths (myth, fact, category, source) values ('Eating sour or cold food makes periods worse.', 'No food has been shown to stop or worsen a period. A balanced diet with iron and water helps most.', 'Lifestyle', 'NHS');
insert into public.myths (myth, fact, category, source) values ('Severe period pain is normal and you just have to bear it.', 'Mild cramps are common, but pain that stops daily life can be a sign of conditions like endometriosis, which a doctor can diagnose and treat.', 'Body', 'WHO');
insert into public.myths (myth, fact, category, source) values ('Periods sync up when people live together.', 'Large studies have not found reliable evidence for “period syncing” — overlaps happen by chance because cycles vary.', 'Body', 'Oxford study (Clue, 2016)');
insert into public.myths (myth, fact, category, source) values ('Only women have periods.', 'Most people who menstruate are women and girls, but some trans men and non-binary people also have periods. Inclusive language helps everyone get care.', 'Culture', 'UNFPA');

insert into public.quiz_questions (position, question, options, correct_index, explanation) values (1, 'How often should you change a pad or tampon?', array['Once a day', 'Every 4–8 hours', 'Only when it’s completely soaked', 'Once a week']::text[], 1, 'Pads every 4–6 hours and tampons every 4–8 hours (never over 8) keeps you comfortable and lowers infection risk.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (2, 'What is a normal cycle length for most adults?', array['Exactly 28 days', '14–18 days', '21–35 days', '40–60 days']::text[], 2, 'Anywhere from about 21 to 35 days is normal. Only some people have exactly 28-day cycles.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (3, 'Which day is counted as Day 1 of the menstrual cycle?', array['The day bleeding stops', 'The first day of bleeding', 'The day of ovulation', 'The first day of PMS']::text[], 1, 'Day 1 is the first day of real bleeding (not spotting). That is why tracking start dates matters.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (4, 'About how much blood is lost in a typical period?', array['2–3 tablespoons (30–40 ml)', 'Half a litre', 'One cup (250 ml)', 'A few drops']::text[], 0, 'A typical period loses roughly 30–40 ml in total, even though it can look like more.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (5, 'Is it safe to exercise during your period?', array['No, it causes heavier bleeding', 'Only if you use a tampon', 'Yes — it can even ease cramps', 'Only after day 5']::text[], 2, 'Exercise is safe and can reduce cramps and improve mood.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (6, 'What is the best way to clean the vaginal area during a period?', array['Douche daily', 'Plain water or a mild unscented wash on the outside', 'Scented sprays', 'Antiseptic liquid inside']::text[], 1, 'The vagina cleans itself. Washing the outer area with water or a mild wash is enough; douching can cause irritation.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (7, 'When does ovulation usually happen?', array['On the first day of the period', 'About 14 days before the next period', 'Right after the period ends, always', 'It doesn’t happen every cycle for anyone']::text[], 1, 'Ovulation typically happens about 14 days before the next period starts — which is why it shifts if your cycle is longer or shorter.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (8, 'Which food helps replace iron lost during periods?', array['Chips', 'Soft drinks', 'Lentils and leafy greens', 'Coffee']::text[], 2, 'Lentils, beans, spinach and jaggery are iron-rich. Vitamin C helps your body absorb it.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (9, 'Which of these is a reason to see a doctor?', array['Mild cramps on day 1', 'A cycle of 30 days', 'Periods lasting more than 7 days or soaking a pad every 1–2 hours', 'Feeling a little tired']::text[], 2, 'Long or very heavy periods can lead to low iron and may need medical care.');
insert into public.quiz_questions (position, question, options, correct_index, explanation) values (10, 'How should used pads be disposed of?', array['Flush them down the toilet', 'Wrap them and put them in a bin', 'Leave them in the bathroom', 'Burn them indoors']::text[], 1, 'Wrap used products in paper or their wrapper and bin them. Flushing blocks pipes and harms the environment.');
