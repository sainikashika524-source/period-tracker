import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, BookOpen, CalendarDays, CircleHelp, Clock, Droplet, Hand, Heart, Recycle, Sparkles, Trash2, Users, Waves } from 'lucide-react'
import { CycleRing } from '../components/CycleRing'
import { Aurora } from '../components/Brand'
import { MythCard } from '../components/MythCard'
import { ButtonLink, Card, Eyebrow, IconTile } from '../components/ui'
import { PHASES, PHASE_ORDER, type Phase } from '../lib/cycle'
import { useCampaignStats, useMyths } from '../lib/queries'
import { useAuth } from '../context/AuthProvider'
import { cn } from '../lib/utils'

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <motion.div {...reveal} className="mx-auto mb-12 max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-[32px] leading-[1.15] font-bold tracking-tight sm:text-[44px]">{title}</h2>
      {sub && <p className="mt-4 text-[16px] leading-relaxed text-muted sm:text-[17px]">{sub}</p>}
    </motion.div>
  )
}

function HeroRing() {
  const [phase, setPhase] = useState<Phase>('menstrual')
  return (
    <Card className="relative overflow-hidden p-6 sm:p-10">
      <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full opacity-30 blur-3xl transition-colors duration-700" style={{ background: PHASES[phase].color }} />
      <div className="relative flex flex-col items-center">
        <CycleRing
          mode="orbit"
          loopMs={20000}
          size="min(320px, 74vw)"
          onDay={(_, p) => setPhase(p)}
          center={(day, p) => (
            <>
              <Heart size={26} className="mb-1 transition-colors" style={{ color: PHASES[p].color }} />
              <span className="text-2xl font-bold" style={{ color: PHASES[p].color }}>
                Cycle Day {day}
              </span>
              <span className="text-sm text-muted">Estimate only</span>
            </>
          )}
        />
        <div className="mt-7 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          {PHASE_ORDER.map((p) => (
            <div key={p} className={cn('rounded-2xl px-3 py-2.5 text-center transition-all duration-500', p === phase ? 'scale-[1.03]' : 'opacity-60')} style={{ background: p === phase ? PHASES[p].soft : 'transparent' }}>
              <span className="mx-auto mb-1 block h-1.5 w-6 rounded-full" style={{ background: PHASES[p].color }} />
              <span className="text-xs font-semibold" style={{ color: p === phase ? PHASES[p].color : undefined }}>
                {PHASES[p].label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 h-10 text-center">
          <AnimatePresence mode="wait">
            <motion.p key={phase} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-sm text-ink-2 dark:text-ink-2">
              {PHASES[phase].blurb}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  )
}

function Impact() {
  const { data, isLoading, isError } = useCampaignStats()
  const live = !!data && data.attempts_completed > 0
  const demo = { participants: 120, completion_rate: 87, avg_score_pct: 78, before: 56, after: 82 }
  const stats = live
    ? { participants: data.participants, completion_rate: data.completion_rate, avg_score_pct: data.avg_score_pct, before: data.before_avg_pct, after: data.after_avg_pct }
    : demo
  const tiles = [
    [`${stats.participants}${live ? '' : '+'}`, live ? 'Participants' : 'Sample participants'],
    [`${stats.completion_rate}%`, 'Quiz completion rate'],
    [`${stats.avg_score_pct}%`, 'Avg. awareness score'],
  ]
  const hasBA = stats.before != null && stats.after != null
  return (
    <section className="bg-bg-2/60 py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <SectionHead
          eyebrow="Community impact"
          title="Built for awareness campaigns"
          sub={
            live
              ? 'Live numbers from quiz attempts on this site. Run the quiz before and after a session to measure what people learned.'
              : 'PeriodWise can be used at college and community sessions to teach menstrual health and measure awareness gains. Figures below are sample values until real quiz data comes in.'
          }
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {tiles.map(([v, l], i) => (
            <motion.div key={l} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
              <Card className="p-8 text-center">
                {isLoading ? <div className="skeleton mx-auto h-11 w-28" /> : <p className="font-mono text-[44px] leading-none font-medium text-rose">{v}</p>}
                <p className="mt-3 text-[15px] text-muted">{l}</p>
              </Card>
            </motion.div>
          ))}
        </div>
        <motion.div {...reveal}>
          <Card className="mx-auto mt-5 max-w-3xl p-7 sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold">Before vs after an awareness session</h3>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', live && hasBA ? 'bg-[#e3f5ea] text-[#2f8a57] dark:bg-[#15301f] dark:text-[#7cc79a]' : 'bg-bg-2 text-muted')}>{live && hasBA ? 'Live data' : 'Demo data'}</span>
            </div>
            <div className="mt-6 space-y-4">
              {(
                [
                  ['Before', hasBA ? stats.before! : demo.before, '#dba1b6'],
                  ['After', hasBA ? stats.after! : demo.after, '#E8507A'],
                ] as const
              ).map(([l, v, c]) => (
                <div key={l} className="flex items-center gap-4">
                  <span className="w-14 text-sm text-muted">{l}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-rose-soft">
                    <motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }} />
                  </div>
                  <span className="w-12 text-right font-mono text-sm font-medium">{v}%</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">
              {isError ? 'Live stats are unavailable right now, so sample values are shown.' : 'Measured with the quiz on this site — choose “before” or “after a session” when you start it.'}
            </p>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { data: myths = [] } = useMyths()
  const startTo = user ? '/app' : '/login?mode=signup'

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <Aurora className="opacity-50" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
            <Eyebrow>Menstrual health & awareness</Eyebrow>
            <h1 className="mt-6 text-[42px] leading-[1.05] font-bold tracking-[-0.025em] sm:text-[58px] xl:text-[64px]">
              Understand your cycle. <span className="text-rose">Understand your</span>{' '}<span className="accent text-rose">health.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted sm:text-lg">Simple, reliable menstrual health information and an easy period tracker — designed to help you learn, track and feel confident.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink to={startTo} size="lg" className="h-14 px-8">
                Start tracking <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink to="/learn" variant="secondary" size="lg" className="h-14 px-8">
                Learn about menstrual health
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <Sparkles size={15} className="text-lav" /> Free · private by default · no ads
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}>
            <HeroRing />
          </motion.div>
        </div>
      </section>

      {/* WHY */}
      <section className="bg-bg-2/60 py-20 sm:py-28">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <SectionHead eyebrow="Why it matters" title="Menstrual health is basic healthcare" sub="Understanding your cycle helps you notice changes early, manage hygiene confidently, and reduces the shame and silence that still surrounds periods." />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: <Heart />, tone: 'rose' as const, t: 'Better self-awareness', b: 'Tracking cycles helps you recognise patterns in mood, energy and symptoms so you understand your own body better.' },
              { icon: <Droplet />, tone: 'lav' as const, t: 'Safer hygiene practices', b: 'Knowing the right products and habits reduces infection risk and keeps everyday hygiene simple and stress-free.' },
              { icon: <Users />, tone: 'rose' as const, t: 'Less stigma, more openness', b: 'Clear information helps break myths and makes it easier to talk about periods without shame.' },
            ].map((c, i) => (
              <motion.div key={c.t} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
                <Card className="h-full p-8 transition-transform duration-300 hover:-translate-y-1">
                  <IconTile tone={c.tone}>{c.icon}</IconTile>
                  <h3 className="mt-6 text-xl font-semibold">{c.t}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{c.b}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <SectionHead eyebrow="What you get" title="Everything in one simple place" sub="PeriodWise brings tracking, education and awareness together in one friendly app." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Clock />, tone: 'rose' as const, t: 'Period tracker', b: 'Log your cycle and get simple estimates for your next period.', to: startTo },
              { icon: <CalendarDays />, tone: 'lav' as const, t: 'Visual calendar', b: 'See period and estimated fertile days on a clean monthly view.', to: user ? '/app/calendar' : startTo },
              { icon: <BookOpen />, tone: 'rose' as const, t: 'Learn', b: 'Clear, age-appropriate articles about the cycle and hygiene.', to: '/learn' },
              { icon: <CircleHelp />, tone: 'lav' as const, t: 'Awareness quiz', b: 'Test what you know with a short, friendly 10-question quiz.', to: '/quiz' },
            ].map((c, i) => (
              <motion.div key={c.t} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
                <Link to={c.to} className="group block h-full">
                  <Card className="h-full p-7 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-rose">
                    <IconTile tone={c.tone}>{c.icon}</IconTile>
                    <h3 className="mt-6 text-lg font-semibold">{c.t}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{c.b}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose opacity-0 transition group-hover:opacity-100">
                      Open <ArrowRight size={14} />
                    </span>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HYGIENE */}
      <section className="bg-bg-2/60 py-20 sm:py-28">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <motion.div {...reveal}>
            <Eyebrow>Hygiene basics</Eyebrow>
            <h2 className="mt-5 text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">Small habits, big difference</h2>
            <p className="mt-4 text-[17px] text-muted">A few consistent habits go a long way in keeping menstrual hygiene safe and comfortable.</p>
            <ul className="mt-8 space-y-4">
              {[
                [<Clock key="c" size={17} />, 'Change your pad or tampon every 4–8 hours, or empty your cup every 8–12.'],
                [<Hand key="h" size={17} />, 'Wash your hands before and after changing products.'],
                [<Waves key="w" size={17} />, 'Use plain water or a mild wash for the outer genital area.'],
                [<Trash2 key="t" size={17} />, 'Wrap used pads or tampons and bin them — never flush.'],
              ].map(([icon, text], i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-soft text-rose">{icon}</span>
                  <span className="pt-1.5 text-[16px] text-ink-2">{text}</span>
                </li>
              ))}
            </ul>
            <ButtonLink to="/learn#hygiene" variant="soft" className="mt-9">
              Read the full hygiene guide
            </ButtonLink>
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
            <div className="rounded-[32px] bg-rose-soft p-8 sm:p-10">
              <IconTile tone="white">
                <Droplet />
              </IconTile>
              <h3 className="mt-6 text-2xl font-semibold">Choosing a product</h3>
              <p className="mt-3 leading-relaxed text-ink-2">Pads, tampons, menstrual cups and period underwear all work — the right choice depends on comfort, flow and lifestyle.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {['Pads', 'Tampons', 'Menstrual cups', 'Period underwear'].map((p) => (
                  <div key={p} className="flex items-center gap-2 rounded-2xl bg-surface/80 px-4 py-3 text-sm font-medium">
                    {p === 'Menstrual cups' || p === 'Period underwear' ? <Recycle size={15} className="text-[#3fae74]" /> : <span className="size-2 rounded-full bg-rose" />}
                    {p}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                <Recycle size={12} className="inline text-[#3fae74]" /> = reusable
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MYTHS */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <SectionHead eyebrow="Busting myths" title="Myths & Facts" sub="Periods come with a lot of misinformation. Tap a card to reveal the fact." />
          <div className="grid gap-5 md:grid-cols-3">
            {myths.slice(0, 3).map((m, i) => (
              <motion.div key={m.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
                <MythCard m={m} />
              </motion.div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <ButtonLink to="/myths" variant="lav" size="lg">
              See all myths & facts
            </ButtonLink>
          </div>
        </div>
      </section>

      <Impact />

      {/* CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <motion.div {...reveal} className="relative overflow-hidden rounded-[36px] bg-lav px-6 py-16 text-center text-white sm:px-12">
            <div className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-rose opacity-40 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full bg-peach opacity-40 blur-3xl" />
            <div className="relative">
              <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[44px]">
                Ready to understand your <span className="accent">cycle?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/85">Create a free account to start tracking, or explore the educational content first — no pressure, no judgement.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink to={startTo} variant="plum" size="lg" className="h-14 px-8">
                  Start tracking
                </ButtonLink>
                <ButtonLink to="/learn" variant="white" size="lg" className="h-14 px-8">
                  Learn about menstrual health
                </ButtonLink>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
