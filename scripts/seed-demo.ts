// Creates (or resets) a demo account with ~6 months of realistic history,
// so the dashboard, calendar and insights have something to show in a demo.
//
//   SUPABASE_SECRET_KEY=sb_secret_xxx node scripts/seed-demo.ts
//
// The secret key bypasses RLS — it is only ever read from the environment here,
// never bundled into the web app and never committed.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const url = env.VITE_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('Set SUPABASE_SECRET_KEY in the environment (and VITE_SUPABASE_URL in .env.local).')
  process.exit(1)
}

const EMAIL = process.env.DEMO_EMAIL ?? 'demo@periodwise.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'PeriodWise-demo-2026'
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// find or create the user
let userId: string | undefined
for (let page = 1; page < 20 && !userId; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  userId = data.users.find((u) => u.email === EMAIL)?.id
  if (data.users.length < 200) break
}
if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { display_name: 'Ananya' } })
  if (error) throw error
  userId = data.user.id
  console.log('Created demo user', EMAIL)
} else {
  await admin.auth.admin.updateUserById(userId, { password: PASSWORD })
  console.log('Resetting existing demo user', EMAIL)
}

await admin.from('daily_logs').delete().eq('user_id', userId)
await admin.from('cycles').delete().eq('user_id', userId)
const { error: pe } = await admin
  .from('profiles')
  .upsert({ id: userId, display_name: 'Ananya', age_group: '18-24', avg_cycle_length: 28, avg_period_length: 5, onboarding_done: true })
if (pe) throw pe

// 7 periods; the latest started 9 days ago so the demo lands in the follicular phase
const lengths = [29, 27, 30, 28, 31, 28]
const periodLens = [5, 4, 6, 5, 5, 5, 5]
const today = new Date()
today.setHours(12, 0, 0, 0)
const starts: Date[] = [addDays(today, -9)]
for (const len of [...lengths].reverse()) starts.unshift(addDays(starts[0], -len))

const cycles = starts.map((s, i) => ({ user_id: userId, start_date: iso(s), end_date: iso(addDays(s, periodLens[i] - 1)) }))
const { error: ce } = await admin.from('cycles').insert(cycles)
if (ce) throw ce

const rnd = (() => {
  let s = 42
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
})()
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
const logs: Record<string, unknown>[] = []
starts.forEach((s, ci) => {
  for (let d = 0; d < periodLens[ci]; d++) {
    const flow = d === 0 ? 'medium' : d === 1 ? 'heavy' : d === 2 ? 'medium' : d === periodLens[ci] - 1 ? 'spotting' : 'light'
    const symptoms = d < 2 ? ['cramps', pick(['backache', 'fatigue', 'headache'])] : d < 3 ? [pick(['fatigue', 'bloating'])] : []
    logs.push({
      user_id: userId,
      date: iso(addDays(s, d)),
      flow,
      symptoms,
      mood: d < 2 ? pick(['sensitive', 'irritable', 'calm']) : pick(['calm', 'happy']),
      energy: d < 2 ? 2 : 3,
      pain_level: d === 0 ? 5 + Math.floor(rnd() * 2) : d === 1 ? 4 : 1,
      water_glasses: 6 + Math.floor(rnd() * 4),
      sleep_hours: 7 + Math.round(rnd() * 2 * 2) / 2,
    })
  }
  // a couple of PMS check-ins before the next period
  if (ci > 0) {
    for (const back of [3, 2]) {
      const date = addDays(s, -back)
      logs.push({ user_id: userId, date: iso(date), flow: 'none', symptoms: ['bloating', pick(['acne', 'cravings', 'tender breasts'])], mood: pick(['anxious', 'irritable', 'sensitive']), energy: 2, pain_level: 2, water_glasses: 7, sleep_hours: 6.5 })
    }
    // a mid-cycle good day
    logs.push({ user_id: userId, date: iso(addDays(s, -14)), flow: 'none', symptoms: [], mood: 'happy', energy: 5, pain_level: 0, water_glasses: 8, sleep_hours: 8 })
  }
})
const { error: le } = await admin.from('daily_logs').upsert(logs, { onConflict: 'user_id,date' })
if (le) throw le

console.log(`Seeded ${cycles.length} periods and ${logs.length} daily logs.`)
console.log(`Sign in with  ${EMAIL}  /  ${PASSWORD}`)
