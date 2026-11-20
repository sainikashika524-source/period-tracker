import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeProvider'

export const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'

export function HeartMark({ size = 20, className, strokeWidth = 2.2 }: { size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d={HEART_PATH} stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ to = '/', light, compact }: { to?: string; light?: boolean; compact?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="PeriodWise home">
      <span
        className={cn(
          'grid size-10 place-items-center rounded-[14px] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6',
          light ? 'bg-white/10 text-white ring-1 ring-white/15 backdrop-blur' : 'bg-rose-soft text-rose',
        )}
      >
        <HeartMark size={20} />
      </span>
      {!compact && <span className={cn('text-[19px] font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>PeriodWise</span>}
    </Link>
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
  return (
    <button
      onClick={() => setMode(next)}
      className={cn('grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-rose-soft hover:text-rose', className)}
      aria-label={`Theme: ${mode}. Switch to ${next}`}
      title={`Theme: ${mode}`}
    >
      <motion.span key={mode} initial={{ rotate: -90, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }}>
        <Icon size={18} />
      </motion.span>
    </button>
  )
}

/** Drifting aurora blobs + falling petals. `night` = plum sky, otherwise blush. Cursor parallax on desktop. */
export function Aurora({ night, petals = 0, className }: { night?: boolean; petals?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 40, damping: 20 })
  const sy = useSpring(my, { stiffness: 40, damping: 20 })
  const x1 = useTransform(sx, (v) => v * 40)
  const y1 = useTransform(sy, (v) => v * 40)
  const x2 = useTransform(sx, (v) => v * -60)
  const y2 = useTransform(sy, (v) => v * -50)

  useEffect(() => {
    if (reduce) return
    const el = ref.current?.parentElement
    if (!el) return
    const on = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      mx.set((e.clientX - r.left) / r.width - 0.5)
      my.set((e.clientY - r.top) / r.height - 0.5)
    }
    el.addEventListener('pointermove', on)
    return () => el.removeEventListener('pointermove', on)
  }, [mx, my, reduce])

  const petalList = Array.from({ length: petals }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280
    const r = seed / 233280
    return {
      left: `${(i / petals) * 100 + r * 8}%`,
      dur: `${14 + r * 12}s`,
      delay: `${-r * 20}s`,
      size: 8 + r * 10,
      sway: `${(r - 0.5) * 160}px`,
      spin: `${180 + r * 360}deg`,
      color: ['#E8507A', '#FFB59E', '#C4B0FF', '#F7A6C0'][i % 4],
    }
  })

  return (
    <div ref={ref} className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {night && <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_10%,#4a1e38_0%,#2A1420_45%,#1a0b13_100%)]" />}
      <motion.div style={{ x: x1, y: y1 }} className="absolute inset-0">
        <div className={cn('blob blob-a', night ? 'opacity-70' : 'opacity-60')} style={{ width: '55%', height: '55%', left: '-10%', top: '-8%', background: '#E8507A' }} />
        <div className={cn('blob blob-c', night ? 'opacity-50' : 'opacity-50')} style={{ width: '45%', height: '45%', right: '-12%', bottom: '5%', background: '#FFB59E' }} />
      </motion.div>
      <motion.div style={{ x: x2, y: y2 }} className="absolute inset-0">
        <div className={cn('blob blob-b', night ? 'opacity-60' : 'opacity-45')} style={{ width: '50%', height: '50%', right: '0%', top: '10%', background: '#8B5CF6' }} />
      </motion.div>
      {night && (
        <div
          className="absolute inset-0 opacity-[.35]"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 85% 70%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 40% 80%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 10% 65%, #fff 50%, transparent 51%), radial-gradient(1.2px 1.2px at 55% 50%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 92% 40%, #fff 50%, transparent 51%)',
          }}
        />
      )}
      {!reduce &&
        petalList.map((p, i) => (
          <span
            key={i}
            className="petal"
            style={
              {
                left: p.left,
                '--dur': p.dur,
                '--delay': p.delay,
                '--sway': p.sway,
                '--spin': p.spin,
              } as React.CSSProperties
            }
          >
            <svg width={p.size} height={p.size * 1.3} viewBox="0 0 10 13">
              <path d="M5 0C8 3 10 6 10 8.5A5 4.5 0 0 1 0 8.5C0 6 2 3 5 0Z" fill={p.color} opacity={night ? 0.55 : 0.4} />
            </svg>
          </span>
        ))}
      {/* subtle grain */}
      <div
        className="absolute inset-0 opacity-[.06] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />
    </div>
  )
}
