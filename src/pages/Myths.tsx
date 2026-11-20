import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useMyths } from '../lib/queries'
import { MythCard } from '../components/MythCard'
import { Chip, EmptyState, PageHeader } from '../components/ui'

export default function Myths() {
  const { data: myths = [] } = useMyths()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('All')
  const cats = useMemo(() => ['All', ...new Set(myths.map((m) => m.category))], [myths])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return myths.filter((m) => (cat === 'All' || m.category === cat) && (!t || m.myth.toLowerCase().includes(t) || m.fact.toLowerCase().includes(t)))
  }, [myths, q, cat])

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title="Myths & Facts" sub="Tap any card to reveal the fact." />
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
              {c !== 'All' && <span className="text-xs opacity-70">{myths.filter((m) => m.category === c).length}</span>}
            </Chip>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search myths…"
            aria-label="Search myths"
            className="h-12 w-full rounded-full border border-line-2 bg-surface pr-11 pl-11 text-[15px] outline-none focus:border-rose focus:ring-4 focus:ring-rose/15"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-rose-soft" aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {list.length} myths shown
      </p>
      {list.length ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                <MythCard m={m} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState icon={<Search />} title={`No myths match “${q}”`} body="Try a different word, or clear the search to see all of them." />
      )}
    </div>
  )
}
