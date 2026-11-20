import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartColumn } from 'lucide-react'
import { ButtonLink, Card, EmptyState, PageHeader, Skeleton } from '../../components/ui'
import { useCycles, useLogs, useProfile } from '../../lib/queries'
import { nudges, summarize } from '../../lib/cycle'
import { fmt } from '../../lib/utils'
import { MOODS } from '../../components/LogSheet'
import { useTheme } from '../../context/ThemeProvider'
import { DataError } from './Dashboard'

const MOOD_SCORE: Record<string, number> = { happy: 5, calm: 4, sensitive: 3, anxious: 2, irritable: 2, sad: 1 }

function ScoreRing({ score }: { score: number }) {
  const C = 2 * Math.PI * 42
  return (
    <svg viewBox="0 0 100 100" className="size-32">
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="9" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#reg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <defs>
        <linearGradient id="reg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8507A" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <text x="50" y="56" textAnchor="middle" className="fill-ink font-mono text-[22px] font-medium">
        {score}
      </text>
    </svg>
  )
}

function ChartCard({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={'p-6 ' + (className ?? '')}>
      <h2 className="font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      <div className="mt-5 h-56">{children}</div>
    </Card>
  )
}

export default function Insights() {
  const { data: profile } = useProfile()
  const { dark } = useTheme()
  const cyclesQ = useCycles()
  const logsQ = useLogs()
  const cycles = cyclesQ.data ?? []
  const logs = logsQ.data ?? []
  const s = useMemo(() => summarize(cycles, { cycle: profile?.avg_cycle_length ?? 28, period: profile?.avg_period_length ?? 5 }), [cycles, profile])
  const alerts = useMemo(() => nudges(s, logs), [s, logs])

  const axis = { stroke: dark ? '#a88d9b' : '#8a7480', fontSize: 12 }
  const grid = dark ? '#3a2432' : '#f3dce5'
  const tooltip = {
    contentStyle: { background: dark ? '#241520' : '#fff', border: `1px solid ${grid}`, borderRadius: 14, fontSize: 13, color: dark ? '#fbeef3' : '#2a1420' },
    cursor: { fill: dark ? '#ffffff08' : '#e8507a0d' },
  }

  const cycleData = s.cycleLengths.slice(-8).map((c) => ({ label: fmt(c.start, { month: 'short' }), length: c.length }))
  const periodData = s.periodLengths.slice(-8).map((c) => ({ label: fmt(c.start, { month: 'short' }), length: c.length }))
  const symptomData = useMemo(() => {
    const counts = new Map<string, number>()
    logs.forEach((l) => l.symptoms.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1)))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }))
  }, [logs])
  const moodData = useMemo(
    () =>
      logs
        .filter((l) => l.mood)
        .slice(-30)
        .map((l) => ({ label: fmt(l.date), score: MOOD_SCORE[l.mood!] ?? 3, mood: MOODS.find((m) => m.v === l.mood)?.label })),
    [logs],
  )

  if (cyclesQ.isError || logsQ.isError) return <DataError onRetry={() => (cyclesQ.refetch(), logsQ.refetch())} />
  if (cyclesQ.isLoading)
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    )

  const enough = cycles.length >= 2 || logs.length >= 3

  return (
    <div>
      <PageHeader title="Insights" sub="Patterns from your own logs. The more you track, the clearer they get." />
      {!enough ? (
        <Card className="p-2">
          <EmptyState icon={<ChartColumn />} title="Insights appear after a couple of periods" body="Log at least two period start dates (or a few daily check-ins) to see your cycle length, symptoms and mood trends." action={<ButtonLink to="/app/calendar">Open calendar</ButtonLink>} />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="flex items-center gap-6 p-6">
            {s.regularity ? <ScoreRing score={s.regularity.score} /> : <div className="grid size-32 place-items-center rounded-full border-[9px] border-line font-mono text-muted">—</div>}
            <div>
              <p className="text-[11px] font-semibold tracking-[.14em] text-muted uppercase">Cycle regularity</p>
              <p className="mt-1 text-2xl font-semibold">{s.regularity?.label ?? 'Not enough data yet'}</p>
              <p className="mt-1 text-sm text-muted">
                {s.regularity ? `Your cycles vary by about ±${s.regularity.sd.toFixed(1)} days.` : 'Log 4 or more periods to calculate a regularity score.'}
              </p>
            </div>
          </Card>
          <Card className="grid grid-cols-3 gap-4 p-6">
            {[
              ['Avg cycle', `${s.avgCycle}d`],
              ['Avg period', `${s.avgPeriod}d`],
              ['Days logged', logs.length],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-bg-2 p-4">
                <p className="text-[11px] font-semibold tracking-[.12em] text-muted uppercase">{l}</p>
                <p className="mt-2 font-mono text-3xl font-medium">{v}</p>
              </div>
            ))}
          </Card>

          <ChartCard title="Cycle length history" sub="Shaded band = typical 21–35 days">
            {cycleData.length ? (
              <ResponsiveContainer>
                <BarChart data={cycleData}>
                  <CartesianGrid vertical={false} stroke={grid} />
                  <ReferenceArea y1={21} y2={35} fill="#8B5CF6" fillOpacity={0.07} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} {...axis} />
                  <YAxis tickLine={false} axisLine={false} width={30} domain={[0, (max: number) => Math.max(40, max + 4)]} {...axis} />
                  <Tooltip {...tooltip} formatter={(v) => [`${v} days`, 'Cycle']} />
                  <Bar dataKey="length" radius={[10, 10, 4, 4]} maxBarSize={42}>
                    {cycleData.map((d, i) => (
                      <Cell key={i} fill={d.length < 21 || d.length > 35 ? '#f59e7b' : '#E8507A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">Needs two or more period start dates.</p>
            )}
          </ChartCard>

          <ChartCard title="Period length" sub="Days of bleeding per period">
            {periodData.length ? (
              <ResponsiveContainer>
                <BarChart data={periodData}>
                  <CartesianGrid vertical={false} stroke={grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} {...axis} />
                  <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} {...axis} />
                  <Tooltip {...tooltip} formatter={(v) => [`${v} days`, 'Period']} />
                  <Bar dataKey="length" fill="#C0659E" radius={[10, 10, 4, 4]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">Log when a period ends to see this.</p>
            )}
          </ChartCard>

          <ChartCard title="Top symptoms" sub="How many days you logged each">
            {symptomData.length ? (
              <ResponsiveContainer>
                <BarChart data={symptomData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} {...axis} style={{ textTransform: 'capitalize' }} />
                  <Tooltip {...tooltip} formatter={(v) => [`${v} days`, 'Logged']} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 10, 10, 4]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">No symptoms logged yet.</p>
            )}
          </ChartCard>

          <ChartCard title="Mood trend" sub="Last 30 days with a mood logged">
            {moodData.length >= 2 ? (
              <ResponsiveContainer>
                <LineChart data={moodData}>
                  <CartesianGrid vertical={false} stroke={grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} {...axis} minTickGap={24} />
                  <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tickFormatter={(v) => ({ 1: 'Low', 3: 'Mixed', 5: 'Great' })[v as 1 | 3 | 5] ?? ''} tickLine={false} axisLine={false} width={48} {...axis} />
                  <Tooltip {...tooltip} formatter={(_v, _n, p) => [(p?.payload as { mood?: string })?.mood ?? '', 'Mood']} />
                  <Line type="monotone" dataKey="score" stroke="#E8507A" strokeWidth={3} dot={{ r: 4, fill: '#E8507A', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">Log your mood on a few days to see a trend.</p>
            )}
          </ChartCard>

          {alerts.length > 0 && (
            <Card className="p-6 md:col-span-2">
              <h2 className="font-semibold">Things to keep an eye on</h2>
              <ul className="mt-3 space-y-3">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-[#fff6f0] p-4 text-sm dark:bg-[#2a1912]">
                    <p className="font-medium">{a.title}</p>
                    <p className="mt-1 text-ink-2">{a.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
