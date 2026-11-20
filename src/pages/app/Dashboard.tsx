import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { CalendarDays, CircleAlert, Droplet, NotebookPen, RotateCcw, Sparkles, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { CycleRing } from '../../components/CycleRing'
import { LogSheet, MOODS } from '../../components/LogSheet'
import { Button, ButtonLink, Card, EmptyState, Skeleton } from '../../components/ui'
import { useCycleMutations, useCycles, useLogs, useProfile } from '../../lib/queries'
import { PHASES, nudges, summarize } from '../../lib/cycle'
import { daysBetween, errorMessage, fmt, greeting, iso, parseISO, today } from '../../lib/utils'

export function DataError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-2">
      <EmptyState
        icon={<CircleAlert />}
        title="Your data didn’t load"
        body="Check your internet connection. If this is a fresh install, the database tables may not be set up yet (see README → Database setup)."
        action={
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw size={16} /> Try again
          </Button>
        }
      />
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[.14em] text-muted uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { data: profile } = useProfile()
  const cyclesQ = useCycles()
  const logsQ = useLogs()
  const cm = useCycleMutations()
  const [logDate, setLogDate] = useState<string | null>(null)

  const cycles = cyclesQ.data ?? []
  const logs = logsQ.data ?? []
  const s = useMemo(() => summarize(cycles, { cycle: profile?.avg_cycle_length ?? 28, period: profile?.avg_period_length ?? 5 }), [cycles, profile])
  const alerts = useMemo(() => nudges(s, logs), [s, logs])
  const todayIso = iso(today())
  const todayLog = logs.find((l) => l.date === todayIso)
  const name = profile?.display_name?.split(' ')[0]

  if (cyclesQ.isError || logsQ.isError)
    return (
      <DataError
        onRetry={() => {
          cyclesQ.refetch()
          logsQ.refetch()
        }}
      />
    )

  const loading = cyclesQ.isLoading || logsQ.isLoading
  const ph = PHASES[s.phase]
  const inPeriod = !!s.openCycle

  async function startToday() {
    try {
      await cm.start.mutateAsync(todayIso)
      toast.success('Period start logged for today.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  async function endToday() {
    if (!s.openCycle) return
    try {
      await cm.end.mutateAsync({ id: s.openCycle.id, end_date: todayIso })
      toast.success('Period end logged for today.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{fmt(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-[30px] leading-tight font-bold tracking-tight sm:text-[38px]">
            {greeting()}
            {name ? (
              <>
                , <span className="accent text-rose">{name}</span>
              </>
            ) : null}
            .
          </h1>
        </div>
        <Button onClick={() => setLogDate(todayIso)} variant="dark">
          <NotebookPen size={17} /> {todayLog ? 'Edit today’s log' : 'Log today'}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-[380px] lg:col-span-2" />
          <Skeleton className="h-[380px]" />
        </div>
      ) : !s.hasData ? (
        <Card className="p-2">
          <EmptyState
            icon={<Droplet />}
            title="Log your first period to see your cycle"
            body="Once you add a start date, PeriodWise estimates your next period, fertile window and current phase."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button loading={cm.start.isPending} onClick={startToday}>
                  It started today
                </Button>
                <ButtonLink to="/app/calendar" variant="secondary">
                  <CalendarDays size={17} /> Pick a date
                </ButtonLink>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* hero */}
          <Card className="relative overflow-hidden p-6 sm:p-8 lg:col-span-2">
            <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full opacity-40 blur-3xl" style={{ background: ph.color }} />
            <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center">
              <CycleRing
                mode="static"
                day={Math.min(s.currentDay, s.avgCycle)}
                cycleLength={s.avgCycle}
                periodLength={s.avgPeriod}
                size="min(300px, 78vw)"
                center={() => (
                  <>
                    <span className="font-mono text-[11px] tracking-[.2em] text-muted uppercase">Cycle day</span>
                    <span className="font-mono text-[56px] leading-none font-medium text-ink">{s.currentDay}</span>
                    <span className="accent mt-1 text-xl" style={{ color: ph.color }}>
                      {ph.label}
                    </span>
                  </>
                )}
              />
              <div className="w-full flex-1">
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: ph.soft, color: ph.color }}>
                  <span className="size-2 rounded-full" style={{ background: ph.color }} /> {ph.label} phase
                </span>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{ph.blurb}</p>

                <div className="mt-6 rounded-3xl bg-bg-2 p-5">
                  {inPeriod ? (
                    <>
                      <p className="text-[11px] font-semibold tracking-[.14em] text-muted uppercase">On your period</p>
                      <p className="mt-1 text-2xl font-semibold">Day {s.currentDay}</p>
                      <Button size="sm" variant="secondary" className="mt-3" loading={cm.end.isPending} onClick={endToday}>
                        My period ended today
                      </Button>
                    </>
                  ) : s.lateBy > 0 ? (
                    <>
                      <p className="text-[11px] font-semibold tracking-[.14em] text-muted uppercase">Next period</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {s.lateBy} day{s.lateBy > 1 ? 's' : ''} later than expected
                      </p>
                      <p className="mt-1 text-sm text-muted">Small shifts are normal — stress, sleep and travel can all move a cycle.</p>
                      <Button size="sm" className="mt-3" loading={cm.start.isPending} onClick={startToday}>
                        My period started today
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[.14em] text-muted uppercase">Next period in</p>
                        <p className="mt-1 font-mono text-4xl font-medium">
                          {s.daysUntilNext}
                          <span className="ml-1.5 font-sans text-base font-medium text-muted">day{s.daysUntilNext === 1 ? '' : 's'}</span>
                        </p>
                        <p className="text-sm text-muted">around {fmt(s.nextStart!, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      </div>
                      <Button size="sm" variant="soft" loading={cm.start.isPending} onClick={startToday}>
                        Started today
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Stat label="Fertile window" value={`${fmt(s.fertileStart!)} – ${fmt(s.fertileEnd!)}`} />
                  <Stat label="Ovulation" value={fmt(s.ovulation!, { weekday: 'short', day: 'numeric', month: 'short' })} />
                </div>
                <p className="mt-4 text-xs text-muted">
                  Estimate only · based on {s.usedHistory ? `your last ${Math.min(6, s.cycleLengths.length)} cycles` : 'your typical cycle length'}. Not a method of contraception.
                </p>
              </div>
            </div>
          </Card>

          {/* today */}
          <Card className="flex flex-col p-6">
            <h2 className="font-semibold">Today</h2>
            {todayLog ? (
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  {todayLog.flow !== 'none' && <span className="rounded-full bg-rose-soft px-3 py-1 font-medium text-rose-deep capitalize dark:text-rose">{todayLog.flow} flow</span>}
                  {todayLog.mood && (
                    <span className="rounded-full px-3 py-1 font-medium text-white" style={{ background: MOODS.find((m) => m.v === todayLog.mood)?.color }}>
                      {MOODS.find((m) => m.v === todayLog.mood)?.label}
                    </span>
                  )}
                  {todayLog.symptoms.map((x) => (
                    <span key={x} className="rounded-full bg-lav-soft px-3 py-1 text-lav-deep capitalize dark:text-[#c4b0ff]">
                      {x}
                    </span>
                  ))}
                </div>
                {(todayLog.pain_level ?? 0) > 0 && <p className="text-ink-2">Pain {todayLog.pain_level}/10</p>}
                {todayLog.notes && <p className="rounded-2xl bg-bg-2 p-3 text-ink-2">“{todayLog.notes}”</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Nothing logged yet. A 20-second check-in builds a clearer picture of your patterns.</p>
            )}
            <div className="mt-auto pt-6">
              <Button variant="secondary" className="w-full" onClick={() => setLogDate(todayIso)}>
                {todayLog ? 'Edit log' : 'Add flow, mood & symptoms'}
              </Button>
            </div>
          </Card>

          {/* phase tips */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: ph.color }} />
              <h2 className="font-semibold">What can help in your {ph.label.toLowerCase()} phase</h2>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {ph.tips.map((t, i) => (
                <motion.li key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} className="rounded-2xl p-4 text-sm leading-relaxed text-ink-2" style={{ background: `${ph.color}12` }}>
                  {t}
                </motion.li>
              ))}
            </ul>
          </Card>

          {/* stats */}
          <Card className="p-6">
            <h2 className="font-semibold">Your averages</h2>
            <div className="mt-4 grid grid-cols-2 gap-5">
              <Stat label="Cycle" value={`${s.avgCycle} days`} sub={s.usedHistory ? 'from your logs' : 'your setting'} />
              <Stat label="Period" value={`${s.avgPeriod} days`} />
              <Stat label="Periods logged" value={cycles.length} />
              <Stat label="Regularity" value={s.regularity ? `${s.regularity.score}` : '—'} sub={s.regularity?.label ?? 'needs 4+ periods'} />
            </div>
            <Link to="/app/insights" className="mt-5 inline-block text-sm font-semibold text-rose hover:underline">
              See insights →
            </Link>
          </Card>

          {alerts.length > 0 && (
            <Card className="border-[#f5c2a8] bg-[#fff6f0] p-6 lg:col-span-3 dark:border-[#5a3424] dark:bg-[#2a1912]">
              <div className="flex items-center gap-2 text-[#c0582f] dark:text-[#ffb59e]">
                <Stethoscope size={18} />
                <h2 className="font-semibold">Worth mentioning to a doctor</h2>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {alerts.map((n) => (
                  <div key={n.id}>
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-sm text-ink-2">{n.body}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* recent */}
          <Card className="p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent periods</h2>
              <Link to="/app/calendar" className="text-sm font-semibold text-rose hover:underline">
                Open calendar →
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {[...cycles]
                .reverse()
                .slice(0, 5)
                .map((c, i, arr) => {
                  const newer = arr[i - 1]
                  const len = c.end_date ? daysBetween(parseISO(c.start_date), parseISO(c.end_date)) + 1 : null
                  const cyc = newer ? daysBetween(parseISO(c.start_date), parseISO(newer.start_date)) : null
                  return (
                    <li key={c.id} className="flex items-center gap-4 py-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-rose-soft text-rose">
                        <Droplet size={17} />
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{fmt(c.start_date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="text-sm text-muted">{len ? `${len}-day period` : 'In progress or end not logged'}</p>
                      </div>
                      {cyc && <span className="rounded-full bg-bg-2 px-3 py-1 font-mono text-xs text-ink-2">{cyc}-day cycle</span>}
                    </li>
                  )
                })}
            </ul>
          </Card>
        </div>
      )}

      <LogSheet date={logDate} onClose={() => setLogDate(null)} cycles={cycles} logs={logs} />
    </div>
  )
}
