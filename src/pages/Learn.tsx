import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { motion } from 'motion/react'
import { CircleAlert, Info, Lightbulb } from 'lucide-react'
import { useArticles } from '../lib/queries'
import type { ArticleBlock } from '../lib/types'
import { ButtonLink, PageHeader } from '../components/ui'
import { cn } from '../lib/utils'

function Block({ b }: { b: ArticleBlock }) {
  if (b.type === 'p') return <p className="text-[17px] leading-[1.8] text-ink-2">{b.text}</p>
  if (b.type === 'ul')
    return (
      <ul className="space-y-3">
        {b.items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[17px] leading-[1.7] text-ink-2">
            <span className="mt-[11px] size-2 shrink-0 rounded-full border-2 border-rose" />
            <span>
              {it.title && <strong className="font-semibold text-ink">{it.title}: </strong>}
              {it.text}
            </span>
          </li>
        ))}
      </ul>
    )
  if (b.type === 'tip')
    return (
      <p className="flex gap-3 rounded-2xl bg-lav-soft p-4 text-[15px] leading-relaxed text-ink-2">
        <Lightbulb size={19} className="mt-0.5 shrink-0 text-lav" />
        {b.text}
      </p>
    )
  return (
    <p className="flex gap-3 rounded-2xl border border-[#f5c2a8] bg-[#fff6f0] p-4 text-[15px] leading-relaxed text-ink-2 dark:border-[#5a3424] dark:bg-[#2a1912]">
      <CircleAlert size={19} className="mt-0.5 shrink-0 text-[#e07a55]" />
      {b.text}
    </p>
  )
}

export default function Learn() {
  const { data: articles = [] } = useArticles()
  const [active, setActive] = useState(articles[0]?.slug)
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [hash])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (vis) setActive(vis.target.id)
      },
      { rootMargin: '-140px 0px -55% 0px' },
    )
    articles.forEach((a) => {
      const el = document.getElementById(a.slug)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [articles])

  return (
    <div className="mx-auto max-w-[860px] px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title="Learn" sub="Simple, reliable information about periods and menstrual health." />
      <p className="flex gap-3 rounded-2xl bg-lav-soft p-5 text-[15px] text-ink-2">
        <Info size={19} className="mt-0.5 shrink-0 text-lav" />
        This platform provides general educational information and is not a substitute for professional medical advice.
      </p>

      <nav className="no-scrollbar sticky top-[72px] z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-bg/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:px-0" aria-label="Topics">
        {articles.map((a) => (
          <a
            key={a.slug}
            href={`#${a.slug}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(a.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              history.replaceState(null, '', `#${a.slug}`)
            }}
            className={cn(
              'relative shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
              active === a.slug ? 'border-transparent text-white' : 'border-line-2 bg-surface text-ink-2 hover:border-rose/40',
            )}
          >
            {active === a.slug && <motion.span layoutId="learn-chip" className="absolute inset-0 rounded-full bg-rose" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative">{a.nav_label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-6">
        {articles.map((a) => (
          <motion.article
            key={a.slug}
            id={a.slug}
            className="scroll-mt-40 border-b border-line py-12 last:border-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <span className="grid size-11 place-items-center rounded-full bg-lav-soft font-mono text-sm font-medium text-lav-deep dark:text-[#c4b0ff]" aria-hidden>
              {a.letter}
            </span>
            <h2 className="mt-5 text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">{a.title}</h2>
            <p className="mt-2 text-[15px] text-muted">{a.summary}</p>
            <div className="mt-6 space-y-5">
              {a.body.map((b, i) => (
                <Block key={i} b={b} />
              ))}
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-rose-soft p-7">
        <div>
          <p className="text-lg font-semibold">Think you’ve got it?</p>
          <p className="text-ink-2">Take the 10-question awareness quiz.</p>
        </div>
        <ButtonLink to="/quiz">Take the quiz</ButtonLink>
      </div>
    </div>
  )
}
