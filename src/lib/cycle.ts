import type { Cycle, DailyLog } from './types'
import { addDays, daysBetween, iso, parseISO, today } from './utils'

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export const PHASES: Record<
  Phase,
  { label: string; color: string; soft: string; blurb: string; tips: string[] }
> = {
  menstrual: {
    label: 'Menstrual',
    color: '#E8507A',
    soft: '#FDE4EC',
    blurb: 'The uterine lining sheds. Energy can dip — rest is productive too.',
    tips: ['Warmth on your lower belly can ease cramps.', 'Iron-rich foods (lentils, spinach) help replace what you lose.', 'Gentle movement like walking or stretching often helps.'],
  },
  follicular: {
    label: 'Follicular',
    color: '#F59E7B',
    soft: '#FFEDE4',
    blurb: 'Oestrogen rises as an egg matures. Many people feel more energetic.',
    tips: ['A good window for harder workouts.', 'Energy and mood often lift — plan the big tasks.', 'Keep up water and sleep as activity rises.'],
  },
  ovulation: {
    label: 'Ovulation',
    color: '#8B5CF6',
    soft: '#EFE8FF',
    blurb: 'An egg is released. This is the most fertile time of the cycle.',
    tips: ['Clear, stretchy discharge is normal around now.', 'Some people feel a brief one-sided twinge (mittelschmerz).', 'Pregnancy is most likely in this window.'],
  },
  luteal: {
    label: 'Luteal',
    color: '#C0659E',
    soft: '#F8E6F1',
    blurb: 'Progesterone rises. PMS symptoms like bloating or mood swings may appear.',
    tips: ['Cut back on salt and caffeine if you feel bloated.', 'Complex carbs and magnesium (nuts, seeds) can steady mood.', 'Be kind to yourself — PMS is real and common.'],
  },
}

export const PHASE_ORDER: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

/** Phase boundaries (1-indexed days) for a given cycle/period length. */
export function phaseRanges(cycleLength: number, periodLength: number) {
  const ov = Math.max(periodLength + 2, cycleLength - 14) // ovulation day estimate
  return {
    menstrual: [1, periodLength] as const,
    follicular: [periodLength + 1, ov - 2] as const,
    ovulation: [ov - 1, ov + 1] as const,
    luteal: [ov + 2, cycleLength] as const,
    ovulationDay: ov,
  }
}

export function phaseForDay(day: number, cycleLength: number, periodLength: number): Phase {
  const r = phaseRanges(cycleLength, periodLength)
  if (day <= r.menstrual[1]) return 'menstrual'
  if (day <= r.follicular[1]) return 'follicular'
  if (day <= r.ovulation[1]) return 'ovulation'
  return 'luteal'
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

export interface CycleSummary {
  hasData: boolean
  avgCycle: number
  avgPeriod: number
  cycleLengths: { start: string; length: number }[]
  periodLengths: { start: string; length: number }[]
  usedHistory: boolean
  lastStart: Date | null
  openCycle: Cycle | null
  currentDay: number
  phase: Phase
  nextStart: Date | null
  daysUntilNext: number
  lateBy: number
  ovulation: Date | null
  fertileStart: Date | null
  fertileEnd: Date | null
  regularity: { score: number; label: string; sd: number } | null
}

/**
 * Predictions use the mean of the last 3–6 real cycle lengths; with fewer than
 * 2 completed cycles we fall back to the profile defaults.
 */
export function summarize(cycles: Cycle[], defaults: { cycle: number; period: number }, now = today()): CycleSummary {
  const sorted = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const cycleLengths: { start: string; length: number }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const len = daysBetween(parseISO(sorted[i - 1].start_date), parseISO(sorted[i].start_date))
    if (len >= 10 && len <= 90) cycleLengths.push({ start: sorted[i - 1].start_date, length: len })
  }
  const periodLengths = sorted
    .filter((c) => c.end_date)
    .map((c) => ({ start: c.start_date, length: daysBetween(parseISO(c.start_date), parseISO(c.end_date!)) + 1 }))
    .filter((p) => p.length > 0 && p.length <= 15)

  const recent = cycleLengths.slice(-6).map((c) => c.length)
  const usedHistory = recent.length >= 2
  const avgCycle = usedHistory ? Math.round(mean(recent)) : defaults.cycle
  const recentP = periodLengths.slice(-6).map((p) => p.length)
  const avgPeriod = recentP.length >= 1 ? Math.round(mean(recentP)) : defaults.period

  const last = sorted.at(-1) ?? null
  const base: CycleSummary = {
    hasData: !!last,
    avgCycle,
    avgPeriod,
    cycleLengths,
    periodLengths,
    usedHistory,
    lastStart: null,
    openCycle: null,
    currentDay: 0,
    phase: 'follicular',
    nextStart: null,
    daysUntilNext: 0,
    lateBy: 0,
    ovulation: null,
    fertileStart: null,
    fertileEnd: null,
    regularity:
      recent.length >= 3
        ? (() => {
            const s = sd(recent)
            const score = Math.max(0, Math.min(100, Math.round(100 - s * 12)))
            return { score, sd: s, label: s <= 2 ? 'Very regular' : s <= 4 ? 'Fairly regular' : s <= 7 ? 'Somewhat irregular' : 'Irregular' }
          })()
        : null,
  }
  if (!last) return base

  const lastStart = parseISO(last.start_date)
  const currentDay = daysBetween(lastStart, now) + 1
  const nextStart = addDays(lastStart, avgCycle)
  const daysUntilNext = daysBetween(now, nextStart)
  const ov = addDays(nextStart, -14)
  // If we're past ovulation for this cycle, the "upcoming" fertile window is next cycle's.
  const thisOv = addDays(lastStart, phaseRanges(avgCycle, avgPeriod).ovulationDay - 1)
  const upcomingOv = daysBetween(now, thisOv) >= -1 ? thisOv : addDays(ov, avgCycle)

  return {
    ...base,
    lastStart,
    openCycle: !last.end_date && currentDay <= 15 ? last : null,
    currentDay,
    phase: currentDay > avgCycle ? 'luteal' : phaseForDay(currentDay, avgCycle, avgPeriod),
    nextStart,
    daysUntilNext,
    lateBy: Math.max(0, -daysUntilNext),
    ovulation: upcomingOv,
    fertileStart: addDays(upcomingOv, -5),
    fertileEnd: addDays(upcomingOv, 1),
  }
}

export type DayKind = {
  period?: boolean
  predictedPeriod?: boolean
  fertile?: boolean
  ovulation?: boolean
  hasLog?: boolean
}

/** Map of yyyy-MM-dd → markers for the calendar (history + next 4 predicted cycles). */
export function calendarMap(cycles: Cycle[], logs: DailyLog[], s: CycleSummary) {
  const map = new Map<string, DayKind>()
  const mark = (d: Date, k: keyof DayKind) => {
    const key = iso(d)
    map.set(key, { ...map.get(key), [k]: true })
  }
  const now = today()
  for (const c of cycles) {
    const start = parseISO(c.start_date)
    let len: number
    if (c.end_date) len = daysBetween(start, parseISO(c.end_date)) + 1
    else {
      // Open cycle: show logged days up to today, never beyond the expected length.
      const elapsed = daysBetween(start, now) + 1
      len = Math.max(1, Math.min(elapsed, s.avgPeriod))
    }
    for (let i = 0; i < Math.min(len, 15); i++) mark(addDays(start, i), 'period')
  }
  for (const l of logs) {
    if (l.flow && l.flow !== 'none') mark(parseISO(l.date), 'period')
    mark(parseISO(l.date), 'hasLog')
  }
  if (s.lastStart) {
    const r = phaseRanges(s.avgCycle, s.avgPeriod)
    for (let k = 0; k <= 4; k++) {
      const cs = addDays(s.lastStart, s.avgCycle * k)
      if (k > 0) for (let i = 0; i < s.avgPeriod; i++) {
        const d = addDays(cs, i)
        if (daysBetween(now, d) >= 0 && !map.get(iso(d))?.period) mark(d, 'predictedPeriod')
      }
      const ov = addDays(cs, r.ovulationDay - 1)
      for (let i = -5; i <= 1; i++) mark(addDays(ov, i), 'fertile')
      mark(ov, 'ovulation')
    }
  }
  return map
}

export interface Nudge {
  id: string
  title: string
  body: string
}

/** Gentle "talk to a doctor" prompts — never diagnoses. */
export function nudges(s: CycleSummary, logs: DailyLog[]): Nudge[] {
  const out: Nudge[] = []
  const odd = s.cycleLengths.filter((c) => c.length < 21 || c.length > 35)
  if (odd.length >= 2 || (s.usedHistory && (s.avgCycle < 21 || s.avgCycle > 35)))
    out.push({
      id: 'length',
      title: 'Your cycle length is outside 21–35 days',
      body: 'Cycles vary, but if this keeps happening it is worth mentioning to a doctor or gynaecologist.',
    })
  if (s.periodLengths.some((p) => p.length > 7))
    out.push({
      id: 'long',
      title: 'A period lasted longer than 7 days',
      body: 'Long or very heavy periods can sometimes point to things like low iron. A check-up can rule this out.',
    })
  const severe = logs.filter((l) => (l.pain_level ?? 0) >= 8)
  if (severe.length >= 2)
    out.push({
      id: 'pain',
      title: 'You have logged severe pain more than once',
      body: 'Pain that stops you from daily activities is not something you have to just live with. A doctor can help.',
    })
  if (s.regularity && s.regularity.sd > 7 && !out.some((n) => n.id === 'length'))
    out.push({
      id: 'irregular',
      title: 'Your cycles vary a lot from month to month',
      body: 'Stress, travel and sleep can shift cycles, but if it continues, consider a check-up.',
    })
  return out
}
