Build **PeriodWise**, a menstrual health awareness platform with a period tracker, as a production-quality web app in this folder (`C:\Users\Nishant\period-tracker`). The reference design is `C:\Users\Nishant\Downloads\PERIOD TRACKER.pdf` (11 pages: Sign in, Home, Learn, Myths & Facts, Quiz, Feedback). Keep its brand: rose pink (~#E8507A) as the primary color, lavender/violet (~#8B5CF6) as the accent, a soft blush background, rounded cards, a heart logo, and the Poppins font. Then improve it a lot. This is my 2nd-year mini project, and it needs to stand clearly above every other submission.

## Stack
- React + Vite + TypeScript, Tailwind CSS, Framer Motion, React Router, lucide-react icons
- Supabase (`@supabase/supabase-js`) for auth, database, and RLS
- Project URL: `https://yphbdisjbjzbfrobjwfd.supabase.co`
- Publishable key: `sb_publishable_QjPxV5wrf9qYEVIAgR04jg_xHIuU-zA`. Put it in `.env.local` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, add `.env.local` to `.gitignore`, and commit a `.env.example`.
- Never put the secret key in frontend code. If you need it for seeding, ask me for it and use it only in a local script that is never bundled.
- Should deploy cleanly to Vercel (SPA rewrites configured).

## Backend (Supabase)
Write SQL migrations in `supabase/migrations/`, then help me apply them (Supabase CLI via `npx supabase login` + `link`, or tell me exactly what to paste into the SQL Editor).
- `profiles`: id → auth.users, display_name, avatar, date of birth/age group, avg_cycle_length (default 28), avg_period_length (default 5), onboarding_done. Auto-created by a trigger on signup.
- `cycles`: user_id, start_date, end_date, notes
- `daily_logs`: user_id, date (unique per user), flow (none/spotting/light/medium/heavy), symptoms (text[]: cramps, headache, bloating, acne, fatigue, backache, tender breasts, nausea), mood, energy, pain level 0–10, water, sleep, notes
- `quiz_questions` + `quiz_attempts` (score, answers jsonb, taken_before_or_after_session flag) so before/after awareness can be measured
- `myths` (myth, fact, category, source) and `articles` (Learn sections A–F: What is it?, The Cycle, Hygiene, Products, Healthy Habits, Pain & Symptoms) as seeded content, readable by anyone
- `feedback`: usefulness, learned_something_new, most_useful_section, topic_request, rating 1–5, comments. Anonymous submission allowed.
- RLS on every table: users read and write only their own rows, content tables are public read-only, feedback is insert-only for the public.
- A `SECURITY DEFINER` RPC `get_campaign_stats()` that returns real aggregates: participant count, quiz completion rate, average score, and before vs after averages. The Home "Community Impact" section should show live numbers, with a "Demo data" fallback only when there is no data yet.
- Seed 10 quiz questions with explanations, 12+ myths with facts, and full article content. Keep it medically accurate, age-appropriate, and inclusive ("people who menstruate").

## Features
1. **Auth**: email/password signup and login, Google OAuth (walk me through enabling it in Supabase + Google Cloud), magic link, forgot/reset password, "Remember me", protected routes, session persistence.
2. **Onboarding** after first signup: a 3-step animated flow (name → last period date → typical cycle and period length).
3. **Tracker dashboard**: a hero cycle ring showing the current cycle day and phase (menstrual / follicular / ovulation / luteal) with a color for each phase, a countdown to the next period, and quick-log buttons. Predictions use the average of the last 3–6 real cycles (fallback to the profile value), plus a fertile window and ovulation estimate, all clearly labelled "estimate only".
4. **Visual calendar**: a month view with logged period days, predicted period days, the fertile window, and ovulation marked. Tap a day to open a bottom-sheet log (flow, symptoms, mood, pain, notes).
5. **Insights**: charts of cycle length history, period length, top symptoms, and mood trends, plus a cycle regularity score. Show gentle "talk to a doctor" nudges for very irregular cycles (<21 or >35 days), periods longer than 7 days, or severe pain.
6. **Learn**, **Myths & Facts** (3D flip cards with search and filter), **Quiz** (animated progress, instant explanation after each answer, results screen with confetti, retake, saved to my history when logged in), and **Feedback**, all reading from and writing to Supabase.
7. **Share via QR**: a page that generates a QR code for the site, for awareness sessions.
8. **Profile/settings**: edit cycle defaults, export my data as CSV, delete my account and data.
9. Dark mode, fully responsive from 360px phones to desktop, keyboard and screen-reader accessible, `prefers-reduced-motion` respected, skeleton loaders, toast notifications, friendly empty and error states, and a "not a substitute for medical advice" disclaimer in the footer.

## The login and signup screen is the centerpiece
Before writing any UI code, use your frontend-design / ui-ux-pro-max skills and make it unforgettable:
- **Desktop split layout.** On the left, a living, animated art panel: a soft drifting aurora/mesh gradient in rose, lavender, and peach. In the middle of it, a large animated cycle ring that slowly moves through the 4 phases, with each phase's name and a one-line fact fading in. Add gentle floating petals or particles and parallax that follows the cursor. On the right, a frosted-glass auth card.
- **Mobile.** The art becomes a compact animated header above the card. No horizontal scroll.
- **Micro-interactions.** Labels float on focus, inputs get a glow ring, the show-password eye animates, a password strength meter appears on signup, inline validation is clear, the form shakes gently on a wrong password, and the submit button morphs into a loading state.
- **Sign in ↔ sign up.** Switch with a smooth shared-layout morph, not a page reload. Buttons for Google and magic link.
- **On successful login.** The ring completes, turns into the heart logo, and expands into the dashboard as one continuous transition.
- **Copy.** A rotating warm tagline, e.g. "Your body. Your rhythm. Your data — private by default." Add a small trust line: "Protected by row-level security. Only you can see your logs."
- **Restraint.** It must feel premium and calm, not gimmicky. Target 60fps, use no heavy 3D libraries, and keep the page fast on a mid-range phone.

## Process
- Plan first, then build in this order: scaffold → Supabase schema and seed → auth + login screen → tracker/calendar → content pages → insights → polish.
- Run the dev server and check every page in the browser at mobile and desktop widths. Fix anything that looks off before you call it done.
- Finish with a README (setup, env vars, schema diagram, features, screenshots) I can show my teacher, plus a short list of talking points for my demo/viva.
