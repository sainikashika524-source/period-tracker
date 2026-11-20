import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, LayoutGroup, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { ArrowLeft, Lock, Mail, MailCheck, ShieldCheck, UserRound, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, setRemember } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { Aurora, HEART_PATH, Logo, ThemeToggle } from '../components/Brand'
import { CycleRing } from '../components/CycleRing'
import { Button, Field } from '../components/ui'
import { PHASES, type Phase } from '../lib/cycle'
import { cn, errorMessage } from '../lib/utils'

type Mode = 'signin' | 'signup' | 'magic' | 'forgot' | 'sent'

const PHASE_LINES: Record<Phase, string> = {
  menstrual: 'The lining sheds. Rest counts as productive.',
  follicular: 'Oestrogen rises — energy often climbs with it.',
  ovulation: 'An egg is released. The most fertile days.',
  luteal: 'Progesterone peaks. PMS is real, and common.',
}

const TAGLINES: [string, string, string][] = [
  ['Your body. Your ', 'rhythm', '.'],
  ['Your data — ', 'private', ' by default.'],
  ['Learn it. Track it. ', 'Own', ' it.'],
]

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())

function strength(pw: string) {
  if (pw.length < 8) return 0
  let s = 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++
  return s
}
const STRENGTH = [
  { label: 'At least 8 characters', color: '#d9c3cd' },
  { label: 'Weak', color: '#f0746b' },
  { label: 'Okay', color: '#f5a65b' },
  { label: 'Strong', color: '#7cc79a' },
  { label: 'Very strong', color: '#3fae74' },
]

/** Only show the Google button once the provider is switched on in Supabase (set VITE_ENABLE_GOOGLE=true). */
const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

// ── Left: the night-sky art panel ─────────────────────────────
function ArtPanel({ compact }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>('menstrual')
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % TAGLINES.length), 5200)
    return () => clearInterval(id)
  }, [])
  const line = TAGLINES[t]

  const ring = (
    <CycleRing
      mode="orbit"
      tone="night"
      loopMs={24000}
      size={compact ? 188 : 'min(400px, 34vw)'}
      onDay={(_, p) => setPhase(p)}
      showTicks={!compact}
      center={(day, p) => (
        <>
          <span className={cn('font-mono tracking-[.2em] text-white/55 uppercase', compact ? 'text-[9px]' : 'text-[11px]')}>Day {String(day).padStart(2, '0')}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={p}
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
              transition={{ duration: 0.45 }}
              className={cn('accent mt-1 text-white', compact ? 'text-2xl' : 'text-[clamp(28px,3vw,44px)]')}
              style={{ textShadow: `0 0 30px ${PHASES[p].color}` }}
            >
              {PHASES[p].label}
            </motion.span>
          </AnimatePresence>
        </>
      )}
    />
  )

  if (compact)
    return (
      <div className="relative overflow-hidden px-5 pt-5 pb-24 text-white">
        <Aurora night petals={6} />
        <div className="relative flex items-center justify-between">
          <Logo light />
          <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
        </div>
        <div className="relative mt-4 flex items-center gap-5">
          {ring}
          <div className="min-w-0">
            <Tagline line={line} t={t} small />
            <AnimatePresence mode="wait">
              <motion.p key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-[13px] leading-snug text-white/65">
                {PHASE_LINES[phase]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    )

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden p-10 text-white xl:p-14">
      <Aurora night petals={14} />
      <div className="relative flex items-center justify-between">
        <Logo light />
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] tracking-[.18em] text-white/60 uppercase backdrop-blur">Menstrual health & awareness</span>
      </div>

      <div className="relative flex flex-col items-center">
        {ring}
        <div className="mt-8 h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="text-center text-[15px] text-white/70"
            >
              <span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: PHASES[phase].color, boxShadow: `0 0 12px ${PHASES[phase].color}` }} />
              {PHASE_LINES[phase]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative">
        <Tagline line={line} t={t} />
        <p className="mt-5 flex items-center gap-2 text-sm text-white/60">
          <ShieldCheck size={16} className="text-[#7cc79a]" /> Protected by row-level security. Only you can see your logs.
        </p>
      </div>
    </div>
  )
}

function Tagline({ line, t, small }: { line: [string, string, string]; t: number; small?: boolean }) {
  return (
    <div className={cn('relative', small ? 'h-[60px]' : 'h-[120px]')}>
      <AnimatePresence mode="wait">
        <motion.h2
          key={t}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn('absolute inset-x-0 font-semibold tracking-tight', small ? 'text-[22px] leading-[1.15]' : 'text-[clamp(36px,3.6vw,54px)] leading-[1.08]')}
        >
          {line[0]}
          <span className="accent bg-gradient-to-r from-[#ff8fb0] via-[#ffb59e] to-[#c4b0ff] bg-clip-text pr-[0.14em] -mr-[0.1em] text-transparent">{line[1]}</span>
          {line[2]}
        </motion.h2>
      </AnimatePresence>
    </div>
  )
}

// ── The success bloom: ring completes → heart → opens into the app ──
function SuccessBloom({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  useEffect(() => {
    const id = setTimeout(onDone, reduce ? 150 : 2050)
    return () => clearTimeout(id)
  }, [onDone, reduce])
  const C = 2 * Math.PI * 80
  return (
    <motion.div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="absolute inset-0 bg-bg/85 backdrop-blur-md" />
      <svg viewBox="0 0 200 200" className="relative size-[220px] overflow-visible">
        <defs>
          <linearGradient id="bloom" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8507A" />
            <stop offset="55%" stopColor="#F59E7B" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#bloom)"
          strokeWidth="11"
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C * 0.72, opacity: 1 }}
          animate={{ strokeDashoffset: 0, opacity: [1, 1, 0], scale: [1, 1, 0.4] }}
          transition={{ strokeDashoffset: { duration: 0.65, ease: [0.6, 0, 0.2, 1] }, opacity: { duration: 1.05, times: [0, 0.7, 1] }, scale: { duration: 1.05, times: [0, 0.7, 1] } }}
          style={{ transformOrigin: '100px 100px' }}
        />
        <motion.g
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.1, 1, 40], opacity: [0, 1, 1, 1] }}
          transition={{ duration: 1.45, delay: 0.55, times: [0, 0.3, 0.5, 1], ease: [0.7, 0, 0.3, 1] }}
          style={{ transformOrigin: '100px 104px' }}
        >
          <path d={HEART_PATH} transform="translate(52 52) scale(4)" fill="#E8507A" />
        </motion.g>
      </svg>
      {/* the app's own background opens from the centre */}
      <motion.div
        className="absolute size-[40px] rounded-full bg-bg"
        initial={{ scale: 0 }}
        animate={{ scale: 120 }}
        transition={{ delay: 1.55, duration: 0.5, ease: [0.6, 0, 0.3, 1] }}
      />
      <span className="sr-only" role="status">
        Signed in. Opening your tracker.
      </span>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function AuthPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRem] = useState(true)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({})
  const [busy, setBusy] = useState<null | 'form' | 'google'>(null)
  const [success, setSuccess] = useState(false)
  const [sentKind, setSentKind] = useState<'magic' | 'confirm' | 'reset'>('magic')
  const shake = useAnimationControls()
  const emailRef = useRef<HTMLInputElement>(null)
  const pending = useRef(false) // stops the auto-redirect racing the success animation
  const next = params.get('next') || '/app'
  const pw = useMemo(() => strength(password), [password])

  useEffect(() => {
    setErrors({})
  }, [mode])

  if (user && !success && !pending.current) return <Navigate to={next} replace />

  const fail = (msg: string, field: 'form' | 'email' | 'password' = 'form') => {
    pending.current = false
    setErrors((e) => ({ ...e, [field]: msg }))
    shake.start({ x: [0, -12, 11, -7, 6, -3, 0], transition: { duration: 0.5 } })
  }

  function validate() {
    const e: typeof errors = {}
    if (!emailOk(email)) e.email = email ? 'That email doesn’t look right — check for typos.' : 'Enter your email address.'
    if (mode === 'signin' && !password) e.password = 'Enter your password.'
    if (mode === 'signup') {
      if (password.length < 8) e.password = 'Use at least 8 characters.'
      if (!name.trim()) e.name = 'Tell us what to call you.'
    }
    setErrors(e)
    if (Object.keys(e).length) shake.start({ x: [0, -12, 11, -7, 6, -3, 0], transition: { duration: 0.5 } })
    return !Object.keys(e).length
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setBusy('form')
    setRemember(remember)
    pending.current = mode === 'signin' || mode === 'signup'
    const origin = window.location.origin
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          if (/confirm/i.test(error.message)) return fail('Confirm your email first — check your inbox for the link we sent.')
          return fail('Email or password is incorrect. Try again or reset your password.', 'password')
        }
        setSuccess(true)
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: `${origin}/app` },
        })
        if (error) return fail(/registered|exists/i.test(error.message) ? 'An account with this email already exists. Sign in instead.' : error.message)
        if (data.session) setSuccess(true)
        else {
          pending.current = false
          setSentKind('confirm')
          setMode('sent')
        }
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${origin}${next}` } })
        if (error) return fail(error.message)
        setSentKind('magic')
        setMode('sent')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/reset-password` })
        if (error) return fail(error.message)
        setSentKind('reset')
        setMode('sent')
      }
    } catch (e) {
      fail(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  async function google() {
    setBusy('google')
    setRemember(remember)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${next}` } })
    if (error) {
      setBusy(null)
      toast.error(/not enabled|unsupported/i.test(error.message) ? 'Google sign-in isn’t switched on for this project yet. Use email for now.' : error.message)
    }
  }

  const copy: Record<Mode, { title: string; sub: string }> = {
    signin: { title: 'Welcome back', sub: 'Sign in to see where you are in your cycle.' },
    signup: { title: 'Create your account', sub: 'Free, private, and takes under a minute.' },
    magic: { title: 'Sign in with a link', sub: 'We’ll email you a one-tap sign-in link. No password needed.' },
    forgot: { title: 'Reset your password', sub: 'Enter your email and we’ll send you a reset link.' },
    sent: {
      title: 'Check your inbox',
      sub:
        sentKind === 'confirm'
          ? `We sent a confirmation link to ${email}. Open it to activate your account.`
          : sentKind === 'reset'
            ? `We sent a password reset link to ${email}.`
            : `We sent a sign-in link to ${email}. It expires in 1 hour.`,
    },
  }
  const isPair = mode === 'signin' || mode === 'signup'

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* art */}
      <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-dvh">
        <ArtPanel />
      </aside>
      <div className="lg:hidden">
        <ArtPanel compact />
      </div>

      {/* form side */}
      <main className="relative z-10 flex min-h-[70dvh] items-start justify-center px-4 pb-12 lg:min-h-dvh lg:items-center lg:overflow-hidden lg:px-10 lg:py-12">
        <Aurora className="hidden opacity-60 lg:block" />
        <div className="absolute top-6 right-6 hidden lg:block">
          <ThemeToggle />
        </div>

        <motion.div animate={shake} className="relative -mt-16 w-full max-w-[440px] lg:mt-0">
          <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], layout: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } }}
            className="rounded-[32px] border border-white/60 bg-surface/95 p-6 lg:bg-[var(--glass)] shadow-[0_30px_80px_-30px_rgba(232,80,122,.45)] backdrop-blur-2xl sm:p-9 dark:border-white/10"
          >
            {!isPair && mode !== 'sent' && (
              <motion.button layout="position" onClick={() => setMode('signin')} className="mb-4 -ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted hover:text-rose">
                <ArrowLeft size={16} /> Back to sign in
              </motion.button>
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={mode + sentKind} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                {mode === 'sent' && (
                  <motion.div initial={{ scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="mb-5 grid size-16 place-items-center rounded-3xl bg-rose-soft text-rose">
                    <MailCheck size={30} />
                  </motion.div>
                )}
                <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">{copy[mode].title}</h1>
                <p className="mt-1.5 text-[15px] text-muted">{copy[mode].sub}</p>
              </motion.div>
            </AnimatePresence>

            {isPair && (
              <LayoutGroup id="auth-tabs">
                <div className="mt-6 grid grid-cols-2 rounded-full bg-bg-2 p-1 ring-1 ring-line" role="tablist" aria-label="Account">
                  {(['signin', 'signup'] as const).map((m) => (
                    <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className="relative h-10 rounded-full text-sm font-semibold">
                      {mode === m && <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-surface shadow-[0_4px_14px_-6px_rgba(232,80,122,.45)] dark:bg-white/12" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span className={cn('relative transition-colors', mode === m ? 'text-ink' : 'text-muted')}>{m === 'signin' ? 'Sign in' : 'Create account'}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            )}

            {mode === 'sent' ? (
              <motion.div layout="position" className="mt-7 space-y-3">
                <Button variant="secondary" className="w-full" onClick={() => setMode('signin')}>
                  Back to sign in
                </Button>
                <p className="text-center text-[13px] text-muted">
                  Didn’t get it? Check spam, or{' '}
                  <button className="font-semibold text-rose hover:underline" onClick={() => setMode(sentKind === 'reset' ? 'forgot' : sentKind === 'magic' ? 'magic' : 'signup')}>
                    try again
                  </button>
                  .
                </p>
              </motion.div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-6">
                <motion.div layout className="space-y-3.5">
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }}>
                        <Field label="Your first name" icon={<UserRound size={18} />} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={60} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Field
                    ref={emailRef}
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    icon={<Mail size={18} />}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((x) => ({ ...x, email: undefined }))
                    }}
                    onBlur={() => email && !emailOk(email) && setErrors((x) => ({ ...x, email: 'That email doesn’t look right — check for typos.' }))}
                    error={errors.email}
                  />
                  <AnimatePresence initial={false}>
                    {isPair && (
                      <motion.div key="pw" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }}>
                        <Field
                          label="Password"
                          type="password"
                          icon={<Lock size={18} />}
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value)
                            if (errors.password) setErrors((x) => ({ ...x, password: undefined }))
                          }}
                          error={errors.password}
                          hint={
                            mode === 'signup' && password ? (
                              <div aria-live="polite">
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4].map((i) => (
                                    <motion.span key={i} className="h-1.5 flex-1 rounded-full bg-line" animate={{ backgroundColor: pw >= i ? STRENGTH[pw].color : 'var(--line)' }} transition={{ duration: 0.3 }} />
                                  ))}
                                </div>
                                <p className="mt-1.5 text-[12px] font-medium" style={{ color: pw ? STRENGTH[pw].color : 'var(--muted)' }}>
                                  {STRENGTH[pw].label}
                                  {pw > 0 && pw < 3 && <span className="font-normal text-muted"> · add a number or symbol</span>}
                                </p>
                              </div>
                            ) : undefined
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {mode === 'signin' && (
                  <motion.div layout="position" className="mt-4 flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2 select-none">
                      <span className="relative grid size-5 place-items-center">
                        <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} className="peer size-5 cursor-pointer appearance-none rounded-md border-[1.5px] border-line-2 bg-surface transition checked:border-rose checked:bg-rose" />
                        <svg viewBox="0 0 12 12" className="pointer-events-none absolute size-3 text-white opacity-0 transition peer-checked:opacity-100" aria-hidden>
                          <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      Remember me
                    </label>
                    <button type="button" onClick={() => setMode('forgot')} className="text-sm font-semibold text-rose hover:underline">
                      Forgot password?
                    </button>
                  </motion.div>
                )}

                <AnimatePresence>
                  {errors.form && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert" className="mt-4 overflow-hidden rounded-2xl bg-[#fde8ec] px-4 py-3 text-sm text-[#b8243f] dark:bg-[#3b1420] dark:text-[#ff8a9c]">
                      {errors.form}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div layout="position" className="mt-6">
                  <Button type="submit" size="lg" loading={busy === 'form'} className="h-14 w-full text-[16px]">
                    {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Email me a link' : 'Send reset link'}
                  </Button>
                </motion.div>

                {isPair && (
                  <motion.div layout="position">
                    <div className="my-6 flex items-center gap-3 text-[13px] text-muted">
                      <span className="h-px flex-1 bg-line-2" /> or continue with <span className="h-px flex-1 bg-line-2" />
                    </div>
                    <div className={GOOGLE_ENABLED ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                      {GOOGLE_ENABLED && (
                        <Button type="button" variant="secondary" onClick={google} loading={busy === 'google'} className="h-12">
                          <GoogleG /> Google
                        </Button>
                      )}
                      <Button type="button" variant="secondary" onClick={() => setMode('magic')} className="h-12">
                        <WandSparkles size={17} className="text-lav" /> Email link
                      </Button>
                    </div>
                  </motion.div>
                )}
              </form>
            )}
          </motion.div>

          <p className="mt-6 px-4 text-center text-[13px] leading-relaxed text-muted">
            PeriodWise is an educational tool, not medical advice.{' '}
            <Link to="/" className="font-medium text-ink-2 underline-offset-2 hover:underline">
              Explore without an account
            </Link>
          </p>
        </motion.div>
      </main>

      <AnimatePresence>{success && <SuccessBloom onDone={() => nav(next, { replace: true })} />}</AnimatePresence>
    </div>
  )
}
