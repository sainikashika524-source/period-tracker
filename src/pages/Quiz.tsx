import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useQueryClient } from '@tanstack/react-query'
import { useQuizHistory, useQuizQuestions } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { Button, ButtonLink, Card, Skeleton } from '../components/ui'
import { cn, fmt } from '../lib/utils'

type Stage = 'exploring' | 'before' | 'after'
const STAGES: { v: Stage; title: string; body: string }[] = [
  { v: 'exploring', title: 'Just exploring', body: 'Test what you know.' },
  { v: 'before', title: 'Before a session', body: 'Your baseline before an awareness talk.' },
  { v: 'after', title: 'After a session', body: 'See how much you learned.' },
]

function Result({ score, total }: { score: number; total: number }) {
  const pct = Math.round((score / total) * 100)
  const C = 2 * Math.PI * 70
  const msg = pct >= 90 ? 'Outstanding — you could teach this.' : pct >= 70 ? 'Great awareness! A few things to brush up on.' : pct >= 40 ? 'Good start. The Learn page fills the gaps.' : 'Every expert started here. Explore Learn and try again.'
  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 160 160" className="size-44">
        <defs>
          <linearGradient id="qr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8507A" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--line)" strokeWidth="12" />
        <motion.circle cx="80" cy="80" r="70" fill="none" stroke="url(#qr)" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - score / total) }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} transform="rotate(-90 80 80)" />
        <text x="80" y="78" textAnchor="middle" className="fill-ink font-mono text-[38px] font-medium">
          {score}/{total}
        </text>
        <text x="80" y="102" textAnchor="middle" className="fill-muted text-[13px]">
          {pct}%
        </text>
      </svg>
      <h2 className="mt-4 text-2xl font-bold">{msg}</h2>
    </div>
  )
}

export default function Quiz() {
  const { data: questions, isLoading } = useQuizQuestions()
  const { user } = useAuth()
  const history = useQuizHistory()
  const qc = useQueryClient()
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [stage, setStage] = useState<Stage>('exploring')
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [review, setReview] = useState(false)

  const qs = questions ?? []
  const q = qs[idx]
  const score = answers.reduce((s, a, i) => s + (qs[i] && a === qs[i].correct_index ? 1 : 0), 0)

  async function begin() {
    setIdx(0)
    setAnswers([])
    setPicked(null)
    setReview(false)
    setPhase('play')
    const { data } = await supabase.rpc('start_quiz_attempt', { p_stage: stage })
    setAttemptId((data as string) ?? null)
  }

  function choose(i: number) {
    if (picked !== null) return
    setPicked(i)
    setAnswers((a) => [...a, i])
  }

  async function next() {
    if (idx + 1 < qs.length) {
      setIdx(idx + 1)
      setPicked(null)
      return
    }
    setPhase('done')
    const finalScore = answers.reduce((s, a, i) => s + (a === qs[i].correct_index ? 1 : 0), 0)
    if (finalScore / qs.length >= 0.7) {
      const colors = ['#E8507A', '#8B5CF6', '#FFB59E', '#F7A6C0']
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors, disableForReducedMotion: true })
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true }), 250)
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true }), 400)
    }
    if (attemptId) {
      await supabase.rpc('finish_quiz_attempt', { p_id: attemptId, p_score: finalScore, p_total: qs.length, p_answers: answers })
      qc.invalidateQueries({ queryKey: ['quiz_history'] })
      qc.invalidateQueries({ queryKey: ['campaign_stats'] })
    }
  }

  // keyboard: 1–4 to answer, Enter for next
  useEffect(() => {
    if (phase !== 'play') return
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const n = Number(e.key)
      if (n >= 1 && n <= (q?.options.length ?? 0)) choose(n - 1)
      if (e.key === 'Enter' && picked !== null) next()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  return (
    <div className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-[34px] font-bold tracking-tight sm:text-[42px]">Awareness Quiz</h1>
        <p className="mt-2 text-muted">10 quick questions on menstrual health & hygiene.</p>
      </div>

      {phase !== 'intro' && (
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-rose-soft" role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={phase === 'done' ? qs.length : idx + (picked !== null ? 1 : 0)}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-rose to-lav" animate={{ width: `${((phase === 'done' ? qs.length : idx + (picked !== null ? 1 : 0)) / Math.max(1, qs.length)) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      )}

      <Card className="overflow-hidden p-6 sm:p-10">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <Skeleton key="s" className="h-72" />
          ) : phase === 'intro' ? (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-xl font-semibold">Where are you taking this?</h2>
              <p className="mt-1 text-sm text-muted">This helps measure what awareness sessions achieve. Your answers are anonymous.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {STAGES.map((s) => (
                  <button key={s.v} onClick={() => setStage(s.v)} aria-pressed={stage === s.v} className={cn('rounded-2xl border p-4 text-left transition', stage === s.v ? 'border-rose bg-rose-soft' : 'border-line-2 hover:border-rose/40')}>
                    <span className="flex items-center justify-between font-semibold">
                      {s.title}
                      <span className={cn('grid size-5 place-items-center rounded-full border-2', stage === s.v ? 'border-rose bg-rose text-white' : 'border-line-2')}>{stage === s.v && <Check size={12} strokeWidth={3} />}</span>
                    </span>
                    <span className="mt-1 block text-sm text-muted">{s.body}</span>
                  </button>
                ))}
              </div>
              <Button size="lg" className="mt-8 w-full sm:w-auto" onClick={begin}>
                Start the quiz <ArrowRight size={18} />
              </Button>
            </motion.div>
          ) : phase === 'play' && q ? (
            <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }}>
              <p className="text-sm font-semibold text-lav">
                Question {idx + 1} of {qs.length}
              </p>
              <h2 className="mt-2 text-[22px] leading-snug font-semibold sm:text-2xl">{q.question}</h2>
              <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answers">
                {q.options.map((o, i) => {
                  const correct = i === q.correct_index
                  const chosen = picked === i
                  const show = picked !== null
                  return (
                    <motion.button
                      key={i}
                      role="radio"
                      aria-checked={chosen}
                      disabled={show}
                      onClick={() => choose(i)}
                      animate={show && chosen && !correct ? { x: [0, -8, 8, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-[16px] transition-all',
                        !show && 'border-line-2 bg-surface-2 hover:-translate-y-0.5 hover:border-rose/50 hover:shadow-soft',
                        show && correct && 'border-[#3fae74] bg-[#e9f7ef] dark:bg-[#15301f]',
                        show && chosen && !correct && 'border-[#e24a5f] bg-[#fde8ec] dark:bg-[#3b1420]',
                        show && !chosen && !correct && 'border-line opacity-55',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-full border font-mono text-sm',
                          show && correct ? 'border-[#3fae74] bg-[#3fae74] text-white' : show && chosen ? 'border-[#e24a5f] bg-[#e24a5f] text-white' : 'border-line-2 text-muted',
                        )}
                      >
                        {show && correct ? <Check size={16} strokeWidth={3} /> : show && chosen ? <X size={16} strokeWidth={3} /> : i + 1}
                      </span>
                      {o}
                    </motion.button>
                  )
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                    <div className="mt-5 rounded-2xl bg-lav-soft p-4 text-[15px] text-ink-2">
                      <strong className={picked === q.correct_index ? 'text-[#2f8a57] dark:text-[#7cc79a]' : 'text-[#c0283f] dark:text-[#ff8a9c]'}>{picked === q.correct_index ? 'Correct. ' : 'Not quite. '}</strong>
                      {q.explanation}
                    </div>
                    <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={next} autoFocus>
                      {idx + 1 < qs.length ? 'Next question' : 'See my results'} <ArrowRight size={18} />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <Result score={score} total={qs.length} />
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={() => setPhase('intro')}>
                  <RotateCcw size={17} /> Retake quiz
                </Button>
                <ButtonLink to="/learn" variant="secondary">
                  Read the Learn guide
                </ButtonLink>
                <Button variant="ghost" onClick={() => setReview((r) => !r)}>
                  {review ? 'Hide answers' : 'Review answers'}
                </Button>
              </div>
              <AnimatePresence>
                {review && (
                  <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8 space-y-3 overflow-hidden">
                    {qs.map((x, i) => {
                      const ok = answers[i] === x.correct_index
                      return (
                        <li key={x.id} className="flex gap-3 rounded-2xl bg-bg-2 p-4 text-sm">
                          <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-white', ok ? 'bg-[#3fae74]' : 'bg-[#e24a5f]')}>{ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</span>
                          <div>
                            <p className="font-medium">{x.question}</p>
                            <p className="mt-1 text-muted">
                              Answer: <span className="text-ink-2">{x.options[x.correct_index]}</span>
                              {!ok && answers[i] != null && <> · you chose “{x.options[answers[i]]}”</>}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </motion.ol>
                )}
              </AnimatePresence>
              {!user && (
                <p className="mt-8 text-center text-sm text-muted">
                  <Link to="/login?mode=signup" className="font-semibold text-rose hover:underline">
                    Create an account
                  </Link>{' '}
                  to keep a history of your scores.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {user && (history.data?.length ?? 0) > 0 && (
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#f5a65b]" />
            <h2 className="font-semibold">Your recent scores</h2>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {history.data!.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted">
                  {fmt(h.created_at.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })} · {STAGES.find((s) => s.v === h.session_stage)?.title}
                </span>
                <span className="font-mono font-medium">
                  {h.score}/{h.total}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
