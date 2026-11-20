import { useEffect, useState } from 'react'
import { Droplet, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Chip, Sheet, inputCls } from './ui'
import type { Cycle, DailyLog, Flow } from '../lib/types'
import { useCycleMutations, useLogMutations } from '../lib/queries'
import { cn, daysBetween, errorMessage, fmt, iso, parseISO, today } from '../lib/utils'

export const FLOWS: { v: Flow; label: string; drops: number }[] = [
  { v: 'none', label: 'None', drops: 0 },
  { v: 'spotting', label: 'Spotting', drops: 1 },
  { v: 'light', label: 'Light', drops: 1 },
  { v: 'medium', label: 'Medium', drops: 2 },
  { v: 'heavy', label: 'Heavy', drops: 3 },
]
export const SYMPTOMS = ['cramps', 'headache', 'bloating', 'acne', 'fatigue', 'backache', 'tender breasts', 'nausea', 'cravings', 'insomnia']
export const MOODS: { v: string; label: string; color: string }[] = [
  { v: 'happy', label: 'Happy', color: '#f5a65b' },
  { v: 'calm', label: 'Calm', color: '#7cc79a' },
  { v: 'sensitive', label: 'Sensitive', color: '#c0659e' },
  { v: 'sad', label: 'Low', color: '#7a8fd6' },
  { v: 'irritable', label: 'Irritable', color: '#e0614f' },
  { v: 'anxious', label: 'Anxious', color: '#8B5CF6' },
]

const empty = (date: string): DailyLog => ({ date, flow: 'none', symptoms: [], mood: null, energy: null, pain_level: null, water_glasses: null, sleep_hours: null, notes: null })

export function coveringCycle(cycles: Cycle[], date: string, maxOpen = 10) {
  const d = parseISO(date)
  return cycles.find((c) => {
    const s = parseISO(c.start_date)
    if (daysBetween(s, d) < 0) return false
    if (c.end_date) return daysBetween(d, parseISO(c.end_date)) >= 0
    return daysBetween(s, d) < maxOpen
  })
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Mini({ value, set, min, max, step = 1, label }: { value: number; set: (n: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Less ${label}`} onClick={() => set(Math.max(min, +(value - step).toFixed(1)))} className="grid size-9 place-items-center rounded-full border border-line-2 hover:border-rose hover:text-rose">
        <Minus size={15} />
      </button>
      <span className="w-12 text-center font-mono text-lg">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => set(Math.min(max, +(value + step).toFixed(1)))} className="grid size-9 place-items-center rounded-full border border-line-2 hover:border-rose hover:text-rose">
        <Plus size={15} />
      </button>
    </div>
  )
}

export function LogSheet({ date, onClose, cycles, logs }: { date: string | null; onClose: () => void; cycles: Cycle[]; logs: DailyLog[] }) {
  const [log, setLog] = useState<DailyLog>(empty(date ?? iso(today())))
  const { save, remove } = useLogMutations()
  const cm = useCycleMutations()
  const existing = date ? logs.find((l) => l.date === date) : undefined

  useEffect(() => {
    if (date) setLog(existing ? { ...empty(date), ...existing } : empty(date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  if (!date) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const set = <K extends keyof DailyLog>(k: K, v: DailyLog[K]) => setLog((l) => ({ ...l, [k]: v }))
  const future = daysBetween(today(), parseISO(date)) > 0
  const cyc = coveringCycle(cycles, date)
  const isStart = cyc?.start_date === date
  const isEnd = cyc?.end_date === date

  async function periodAction(kind: 'start' | 'end' | 'unend' | 'remove') {
    try {
      if (kind === 'start') {
        await cm.start.mutateAsync(date!)
        if (log.flow === 'none') set('flow', 'medium')
        toast.success(`Period start logged for ${fmt(date!)}.`)
      } else if (kind === 'end' && cyc) {
        await cm.end.mutateAsync({ id: cyc.id, end_date: date! })
        toast.success(`Period end logged for ${fmt(date!)}.`)
      } else if (kind === 'unend' && cyc) {
        await cm.end.mutateAsync({ id: cyc.id, end_date: null })
      } else if (kind === 'remove' && cyc) {
        await cm.remove.mutateAsync(cyc.id)
        toast.success('Period removed.')
      }
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function onSave() {
    try {
      await save.mutateAsync(log)
      toast.success(`Saved your log for ${fmt(date!)}.`)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const periodBusy = cm.start.isPending || cm.end.isPending || cm.remove.isPending

  return (
    <Sheet
      open={!!date}
      onClose={onClose}
      title={
        <span>
          {fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })}
          {date === iso(today()) && <span className="ml-2 rounded-full bg-rose-soft px-2 py-0.5 align-middle text-xs font-semibold text-rose">Today</span>}
        </span>
      }
      footer={
        future ? undefined : (
          <div className="flex gap-3">
            {existing && (
              <Button
                variant="ghost"
                aria-label="Delete this day's log"
                onClick={async () => {
                  await remove.mutateAsync(date)
                  toast.success('Log deleted.')
                  onClose()
                }}
              >
                <Trash2 size={17} />
              </Button>
            )}
            <Button className="flex-1" size="lg" loading={save.isPending} onClick={onSave}>
              Save log
            </Button>
          </div>
        )
      }
    >
      {future ? (
        <p className="py-6 text-center text-muted">You can log this day once it arrives.</p>
      ) : (
        <div className="divide-y divide-line">
          {/* period start / end */}
          <div className="pb-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-soft/60 p-3">
              <Droplet size={18} className="text-rose" />
              <span className="mr-auto text-sm font-medium">
                {isStart ? 'Period started this day' : isEnd ? 'Period ended this day' : cyc ? `Day ${daysBetween(parseISO(cyc.start_date), parseISO(date)) + 1} of your period` : 'Not marked as a period day'}
              </span>
              {!cyc && (
                <Button size="sm" loading={periodBusy} onClick={() => periodAction('start')}>
                  Period started
                </Button>
              )}
              {cyc && !isStart && !cyc.end_date && (
                <Button size="sm" variant="secondary" loading={periodBusy} onClick={() => periodAction('end')}>
                  Period ended
                </Button>
              )}
              {isEnd && (
                <Button size="sm" variant="ghost" loading={periodBusy} onClick={() => periodAction('unend')}>
                  Undo end
                </Button>
              )}
              {isStart && (
                <Button size="sm" variant="ghost" loading={periodBusy} onClick={() => periodAction('remove')}>
                  Remove period
                </Button>
              )}
            </div>
          </div>

          <Section title="Flow">
            <div className="grid grid-cols-5 gap-2">
              {FLOWS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  aria-pressed={log.flow === f.v}
                  onClick={() => set('flow', f.v)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-medium transition active:scale-95',
                    log.flow === f.v ? 'border-rose bg-rose text-white' : 'border-line-2 text-ink-2 hover:border-rose/50',
                  )}
                >
                  <span className="flex h-4 items-end gap-0.5">
                    {f.drops === 0 ? <span className="h-0.5 w-3 rounded bg-current opacity-50" /> : Array.from({ length: f.drops }, (_, i) => <Droplet key={i} size={f.v === 'spotting' ? 10 : 13} fill="currentColor" />)}
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Symptoms" aside={log.symptoms.length ? <span className="text-xs text-muted">{log.symptoms.length} selected</span> : null}>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <Chip key={s} active={log.symptoms.includes(s)} color="#8B5CF6" className="h-9 capitalize" onClick={() => set('symptoms', log.symptoms.includes(s) ? log.symptoms.filter((x) => x !== s) : [...log.symptoms, s])}>
                  {s}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Mood">
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip key={m.v} active={log.mood === m.v} color={m.color} className="h-9" onClick={() => set('mood', log.mood === m.v ? null : m.v)}>
                  <span className="size-2 rounded-full" style={{ background: log.mood === m.v ? '#fff' : m.color }} />
                  {m.label}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Energy">
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Energy">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={log.energy === n}
                  type="button"
                  onClick={() => set('energy', log.energy === n ? null : n)}
                  className={cn('h-10 rounded-xl border text-sm font-medium transition', log.energy && n <= log.energy ? 'border-transparent bg-[#f59e7b] text-white' : 'border-line-2 text-muted hover:border-[#f59e7b]')}
                >
                  {['Drained', 'Low', 'Okay', 'Good', 'High'][n - 1]}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Pain" aside={<span className="font-mono text-sm text-rose">{log.pain_level ?? 0}/10</span>}>
            <input type="range" min={0} max={10} value={log.pain_level ?? 0} onChange={(e) => set('pain_level', +e.target.value)} className="pain w-full" aria-label="Pain level from 0 to 10" />
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>None</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </Section>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Water (glasses)</h3>
              <Mini label="water" value={log.water_glasses ?? 0} set={(n) => set('water_glasses', n)} min={0} max={30} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Sleep (hours)</h3>
              <Mini label="sleep" value={log.sleep_hours ?? 7} set={(n) => set('sleep_hours', n)} min={0} max={24} step={0.5} />
            </div>
          </div>

          <Section title="Notes">
            <textarea className={inputCls + ' h-24 resize-none py-3'} maxLength={2000} placeholder="Anything worth remembering about today?" value={log.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
          </Section>
        </div>
      )}
    </Sheet>
  )
}

