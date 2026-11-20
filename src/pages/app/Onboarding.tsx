import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Aurora, Logo } from '../../components/Brand'
import { CycleRing } from '../../components/CycleRing'
import { Button, Chip, inputCls } from '../../components/ui'
import { useCycleMutations, useProfile, useUpdateProfile } from '../../lib/queries'
import { addDays, daysBetween, errorMessage, fmt, iso, parseISO, today } from '../../lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthProvider'
import { supabase } from '../../lib/supabase'

const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45+']

function Stepper({ value, set, min, max, unit }: { value: number; set: (n: number) => void; min: number; max: number; unit: string }) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => set(Math.max(min, value - 1))} className="grid size-12 place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition hover:border-rose hover:text-rose active:scale-95" aria-label={`Decrease ${unit}`}>
        <Minus size={18} />
      </button>
      <div className="w-24 text-center">
        <motion.div key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-mono text-4xl font-medium text-ink">
          {value}
        </motion.div>
        <div className="text-xs text-muted">{unit}</div>
      </div>
      <button type="button" onClick={() => set(Math.min(max, value + 1))} className="grid size-12 place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition hover:border-rose hover:text-rose active:scale-95" aria-label={`Increase ${unit}`}>
        <Plus size={18} />
      </button>
    </div>
  )
}

export default function Onboarding() {
  const { data: profile } = useProfile()
  const { user } = useAuth()
  const update = useUpdateProfile()
  const { start } = useCycleMutations()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState('')
  const [age, setAge] = useState<string | null>(null)
  const [last, setLast] = useState<string>('')
  const [unknown, setUnknown] = useState(false)
  const [cycle, setCycle] = useState(28)
  const [period, setPeriod] = useState(5)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name)
    if (profile?.onboarding_done) nav('/app', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }
  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? unknown || !!last : true
  const day = last ? daysBetween(parseISO(last), today()) + 1 : 14

  async function finish() {
    setSaving(true)
    try {
      if (last && !unknown) {
        await start.mutateAsync(last)
        const end = addDays(parseISO(last), period - 1)
        if (daysBetween(end, today()) >= 0) {
          await supabase.from('cycles').update({ end_date: iso(end) }).eq('user_id', user!.id).eq('start_date', last)
          qc.invalidateQueries({ queryKey: ['cycles'] })
        }
      }
      await update.mutateAsync({ display_name: name.trim(), age_group: age, avg_cycle_length: cycle, avg_period_length: period, onboarding_done: true })
      toast.success(`You’re all set, ${name.trim()}.`)
      nav('/app', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    {
      title: (
        <>
          Hi there. What should we <span className="accent text-rose">call</span> you?
        </>
      ),
      body: (
        <div className="space-y-6">
          <input autoFocus className={inputCls + ' h-14 text-lg'} placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Your first name" />
          <div>
            <p className="mb-3 text-sm font-semibold">
              Age group <span className="font-normal text-muted">(optional — helps tailor tips)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((a) => (
                <Chip key={a} active={age === a} onClick={() => setAge(age === a ? null : a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: (
        <>
          When did your last period <span className="accent text-rose">start</span>?
        </>
      ),
      body: (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 7].map((n) => {
              const d = iso(addDays(today(), -n))
              return (
                <Chip
                  key={n}
                  active={last === d && !unknown}
                  onClick={() => {
                    setLast(d)
                    setUnknown(false)
                  }}
                >
                  {n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n === 7 ? 'A week ago' : `${n} days ago`}
                </Chip>
              )
            })}
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Or pick a date</span>
            <input
              type="date"
              className={inputCls}
              max={iso(today())}
              min={iso(addDays(today(), -90))}
              value={last}
              onChange={(e) => {
                setLast(e.target.value)
                setUnknown(false)
              }}
            />
          </label>
          <button type="button" onClick={() => setUnknown((u) => !u)} className={`text-sm font-medium ${unknown ? 'text-rose' : 'text-muted hover:text-ink'}`}>
            {unknown ? '✓ ' : ''}I don’t remember — I’ll log my next one
          </button>
        </div>
      ),
    },
    {
      title: (
        <>
          How long is a <span className="accent text-rose">typical</span> cycle for you?
        </>
      ),
      body: (
        <div className="space-y-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
            <div>
              <p className="mb-3 text-sm font-semibold">Cycle length</p>
              <Stepper value={cycle} set={setCycle} min={18} max={45} unit="days" />
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Period length</p>
              <Stepper value={period} set={setPeriod} min={2} max={10} unit="days" />
            </div>
          </div>
          <p className="rounded-2xl bg-lav-soft px-4 py-3 text-sm text-ink-2">Not sure? Keep 28 and 5. After a few logged periods, PeriodWise uses your real average instead.</p>
        </div>
      ),
    },
  ]

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <Aurora className="opacity-70" />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo to="/app/welcome" />
          <div className="flex gap-2" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-2 rounded-full" animate={{ width: i === step ? 28 : 8, backgroundColor: i <= step ? '#E8507A' : 'var(--line-2)' }} />
            ))}
          </div>
        </div>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_360px]">
          <div className="min-h-[420px]">
            <p className="mb-3 font-mono text-xs tracking-[.2em] text-muted uppercase">Step {step + 1} of 3</p>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <h1 className="mb-8 max-w-xl text-[32px] leading-[1.12] font-bold tracking-tight sm:text-[44px]">{steps[step].title}</h1>
                {steps[step].body}
              </motion.div>
            </AnimatePresence>
            <div className="mt-10 flex items-center gap-3">
              {step > 0 && (
                <Button variant="ghost" onClick={() => go(step - 1)}>
                  <ArrowLeft size={18} /> Back
                </Button>
              )}
              {step < 2 ? (
                <Button size="lg" disabled={!canNext} onClick={() => go(step + 1)}>
                  Continue <ArrowRight size={18} />
                </Button>
              ) : (
                <Button size="lg" loading={saving} onClick={finish}>
                  Open my tracker <ArrowRight size={18} />
                </Button>
              )}
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <div className="rounded-[36px] border border-line bg-surface/70 p-8 shadow-soft backdrop-blur-xl">
              <CycleRing
                mode="static"
                day={Math.max(1, Math.min(day, cycle))}
                cycleLength={cycle}
                periodLength={period}
                size={290}
                center={(d, p) => (
                  <>
                    <span className="font-mono text-[11px] tracking-[.2em] text-muted uppercase">Preview</span>
                    <span className="mt-1 text-3xl font-bold">Day {d}</span>
                    <span className="accent text-lg capitalize text-ink-2">{p}</span>
                  </>
                )}
              />
              <p className="mt-6 text-center text-sm text-muted">{last && !unknown ? `Started ${fmt(last, { day: 'numeric', month: 'long' })}` : 'Your ring updates as you answer'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
