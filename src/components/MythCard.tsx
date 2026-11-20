import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Check, RotateCcw } from 'lucide-react'
import type { Myth } from '../lib/types'
import { cn } from '../lib/utils'

export function MythCard({ m, className }: { m: Myth; className?: string }) {
  const [flipped, setFlipped] = useState(false)
  const reduce = useReducedMotion()
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={flipped ? `Fact: ${m.fact}. Tap to see the myth again.` : `Myth: ${m.myth}. Tap to reveal the fact.`}
      className={cn('flip group block h-[260px] w-full text-left', className)}
      data-flipped={!reduce && flipped}
    >
      <div className="flip-inner relative h-full w-full">
        {/* front */}
        <div className={cn('flip-face absolute inset-0 flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-soft transition-shadow group-hover:shadow-rose', reduce && flipped && 'hidden')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.16em] text-rose uppercase">Myth</span>
            <span className="rounded-full bg-bg-2 px-2.5 py-1 text-[11px] font-medium text-muted">{m.category}</span>
          </div>
          <p className="mt-4 text-[19px] leading-snug font-medium text-ink">{m.myth}</p>
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm text-muted italic transition group-hover:text-rose">Tap to reveal the fact →</span>
        </div>
        {/* back */}
        <div className={cn('flip-face flip-back absolute inset-0 flex flex-col rounded-3xl bg-gradient-to-br from-lav to-[#a77bff] p-7 text-white shadow-[0_24px_50px_-24px_rgba(139,92,246,.8)]', reduce && (flipped ? 'transform-none' : 'hidden'))}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[.16em] uppercase">
            <Check size={14} strokeWidth={3} /> Fact
          </span>
          <p className="mt-4 text-[16px] leading-relaxed">{m.fact}</p>
          <div className="mt-auto flex items-center justify-between text-xs text-white/75">
            {m.source ? <span>Source: {m.source}</span> : <span />}
            <RotateCcw size={14} />
          </div>
        </div>
      </div>
    </button>
  )
}
