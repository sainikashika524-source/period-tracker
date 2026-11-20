import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LogSheet } from '../../components/LogSheet'
import { Button, Card, PageHeader, Skeleton } from '../../components/ui'
import { useCycles, useLogs, useProfile } from '../../lib/queries'
import { calendarMap, summarize } from '../../lib/cycle'
import { cn, iso, today } from '../../lib/utils'
import { DataError } from './Dashboard'

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Legend() {
  const items = [
    { label: 'Period', el: <span className="size-4 rounded-full bg-rose" /> },
    { label: 'Predicted period', el: <span className="size-4 rounded-full border-2 border-dashed border-rose" /> },
    { label: 'Fertile window', el: <span className="size-4 rounded-full bg-lav-soft ring-1 ring-lav/30" /> },
    { label: 'Ovulation (est.)', el: <span className="size-4 rounded-full border-2 border-lav bg-surface" /> },
    { label: 'Has a log', el: <span className="grid size-4 place-items-center"><span className="size-1.5 rounded-full bg-ink-2" /></span> },
  ]
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.el}
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export default function CalendarPage() {
  const { data: profile } = useProfile()
  const cyclesQ = useCycles()
  const logsQ = useLogs()
  const cycles = cyclesQ.data ?? []
  const logs = logsQ.data ?? []
  const [cursor, setCursor] = useState(() => {
    const d = today()
    return new Date(d.getFullYear(), d.getMonth(), 1, 12)
  })
  const [dir, setDir] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)

  const s = useMemo(() => summarize(cycles, { cycle: profile?.avg_cycle_length ?? 28, period: profile?.avg_period_length ?? 5 }), [cycles, profile])
  const map = useMemo(() => calendarMap(cycles, logs, s), [cycles, logs, s])

  const days = useMemo(() => {
    const first = new Date(cursor)
    const offset = (first.getDay() + 6) % 7 // Monday-first
    const start = new Date(first)
    start.setDate(1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const move = (n: number) => {
    setDir(n)
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1, 12))
  }
  const todayIso = iso(today())

  if (cyclesQ.isError || logsQ.isError) return <DataError onRetry={() => (cyclesQ.refetch(), logsQ.refetch())} />

  const lastRowNeeded = days.slice(35).some((d) => d.getMonth() === cursor.getMonth())
  const visible = lastRowNeeded ? days : days.slice(0, 35)

  return (
    <div>
      <PageHeader title="Calendar" sub="Tap any day to log your period, flow, mood or symptoms." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="p-4 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold sm:text-2xl">
              {cursor.toLocaleDateString(undefined, { month: 'long' })} <span className="font-normal text-muted">{cursor.getFullYear()}</span>
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const d = today()
                  setDir(1)
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1, 12))
                }}
              >
                Today
              </Button>
              <button onClick={() => move(-1)} className="grid size-10 place-items-center rounded-full hover:bg-rose-soft" aria-label="Previous month">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => move(1)} className="grid size-10 place-items-center rounded-full hover:bg-rose-soft" aria-label="Next month">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 pb-2 text-center text-[11px] font-semibold tracking-wider text-muted uppercase">
            {WEEK.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          {cyclesQ.isLoading ? (
            <Skeleton className="h-[360px]" />
          ) : (
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={cursor.toISOString()}
                initial={{ opacity: 0, x: dir * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -30 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-7 gap-y-1.5"
                role="grid"
              >
                {visible.map((d) => {
                  const key = iso(d)
                  const k = map.get(key) ?? {}
                  const inMonth = d.getMonth() === cursor.getMonth()
                  const isToday = key === todayIso
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${k.period ? ', period' : ''}${k.predictedPeriod ? ', predicted period' : ''}${k.ovulation ? ', estimated ovulation' : k.fertile ? ', fertile window' : ''}`}
                      className={cn('group relative flex aspect-square items-center justify-center', !inMonth && 'opacity-35')}
                    >
                      {/* fertile band */}
                      {k.fertile && !k.period && <span className="absolute inset-x-0 inset-y-[14%] bg-lav-soft" />}
                      <span
                        className={cn(
                          'relative grid size-[82%] max-w-14 place-items-center rounded-full text-[15px] font-medium transition-all group-hover:scale-105 sm:text-base',
                          k.period && 'bg-rose text-white shadow-[0_6px_14px_-6px_rgba(232,80,122,.9)]',
                          !k.period && k.predictedPeriod && 'border-2 border-dashed border-rose text-rose',
                          !k.period && !k.predictedPeriod && k.ovulation && 'border-2 border-lav bg-surface text-lav-deep dark:text-[#c4b0ff]',
                          !k.period && !k.predictedPeriod && !k.ovulation && 'group-hover:bg-rose-soft',
                          isToday && !k.period && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
                          isToday && k.period && 'ring-2 ring-rose ring-offset-2 ring-offset-surface',
                        )}
                      >
                        {d.getDate()}
                        {k.hasLog && <span className={cn('absolute bottom-[14%] size-1 rounded-full', k.period ? 'bg-white' : 'bg-ink-2')} />}
                      </span>
                    </button>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Legend</h2>
            <Legend />
          </Card>
          {s.hasData && (
            <Card className="p-6">
              <h2 className="font-semibold">Coming up</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Next period</dt>
                  <dd className="font-medium">{s.nextStart?.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Fertile window</dt>
                  <dd className="font-medium">
                    {s.fertileStart?.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {s.fertileEnd?.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Cycle length used</dt>
                  <dd className="font-medium">{s.avgCycle} days</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted">Predictions are estimates and get better the more periods you log.</p>
            </Card>
          )}
        </div>
      </div>
      <LogSheet date={selected} onClose={() => setSelected(null)} cycles={cycles} logs={logs} />
    </div>
  )
}
