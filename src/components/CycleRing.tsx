import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useTime, useTransform, animate, useMotionValue } from 'motion/react'
import { PHASES, PHASE_ORDER, phaseForDay, phaseRanges, type Phase } from '../lib/cycle'
import { cn } from '../lib/utils'

const R = 80
const SW = 11

function polar(angle: number, r = R) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) }
}
function arc(start: number, end: number, r = R) {
  const s = polar(start, r)
  const e = polar(end, r)
  const large = end - start > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

interface Props {
  cycleLength?: number
  periodLength?: number
  /** orbit: the moon travels the cycle on a loop. static: parked on `day`. */
  mode?: 'orbit' | 'static'
  day?: number
  size?: number | string
  tone?: 'night' | 'day'
  /** ms for one full cycle in orbit mode */
  loopMs?: number
  onDay?: (day: number, phase: Phase) => void
  center?: (day: number, phase: Phase) => ReactNode
  className?: string
  showTicks?: boolean
}

/**
 * The PeriodWise signature: a cycle drawn as four phase arcs with a glowing
 * "moon" travelling through them. Used on login, home and the dashboard.
 */
export function CycleRing({
  cycleLength = 28,
  periodLength = 5,
  mode = 'static',
  day = 1,
  size = 320,
  tone = 'day',
  loopMs = 22000,
  onDay,
  center,
  className,
  showTicks = true,
}: Props) {
  const reduce = useReducedMotion()
  const orbit = mode === 'orbit' && !reduce
  const L = cycleLength
  const ranges = phaseRanges(L, periodLength)
  const gap = 2.2 // degrees between arcs

  const arcs = useMemo(
    () =>
      PHASE_ORDER.map((p) => {
        const [a, b] = ranges[p]
        const start = ((a - 1) / L) * 360 + gap / 2
        const end = (b / L) * 360 - gap / 2
        return { phase: p, d: arc(start, Math.max(start + 0.5, end)) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L, periodLength],
  )

  // ── angle source ────────────────────────────────────────────
  const time = useTime()
  const orbitAngle = useTransform(time, (t) => ((t % loopMs) / loopMs) * 360)
  const staticAngle = useMotionValue(0)
  const angle = orbit ? orbitAngle : staticAngle

  const [curDay, setCurDay] = useState(mode === 'orbit' ? 1 : day)
  const lastDay = useRef(curDay)

  // static: settle the moon onto the day with a spring on mount / change
  useEffect(() => {
    if (orbit) return
    const target = ((Math.min(day, L) - 0.5) / L) * 360
    if (reduce) {
      staticAngle.set(target)
      setCurDay(day)
      return
    }
    const c = animate(staticAngle, target, { type: 'spring', stiffness: 40, damping: 14, mass: 1.2 })
    return () => c.stop()
  }, [day, L, orbit, reduce, staticAngle])

  // reduced-motion orbit: step through phase midpoints instead of moving
  useEffect(() => {
    if (!(mode === 'orbit' && reduce)) return
    const mids = PHASE_ORDER.map((p) => Math.round((ranges[p][0] + ranges[p][1]) / 2))
    let i = 0
    const set = () => {
      const d = mids[i++ % mids.length]
      staticAngle.set(((d - 0.5) / L) * 360)
      setCurDay(d)
    }
    set()
    const id = setInterval(set, 4500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, reduce, L])

  useMotionValueEvent(angle, 'change', (a) => {
    const d = Math.min(L, Math.max(1, Math.floor((a / 360) * L) + 1))
    if (d !== lastDay.current) {
      lastDay.current = d
      setCurDay(d)
    }
  })

  const phase = phaseForDay(Math.min(curDay, L), L, periodLength)
  useEffect(() => {
    onDay?.(curDay, phase)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curDay])

  const night = tone === 'night'
  const moonColor = PHASES[phase].color
  const dotSizePct = 9

  return (
    <div className={cn('relative aspect-square select-none', className)} style={{ width: size }} role="img" aria-label={`Cycle day ${curDay}, ${PHASES[phase].label} phase`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id={`halo-${tone}`} cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor={night ? '#E8507A' : '#E8507A'} stopOpacity="0" />
            <stop offset="80%" stopColor={night ? '#E8507A' : '#E8507A'} stopOpacity={night ? 0.16 : 0.07} />
            <stop offset="100%" stopColor="#E8507A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill={`url(#halo-${tone})`} />
        {/* track */}
        <circle cx="100" cy="100" r={R} fill="none" stroke={night ? 'rgba(255,255,255,0.07)' : 'var(--line)'} strokeWidth={SW} />
        {/* day ticks */}
        {showTicks &&
          Array.from({ length: L }, (_, i) => {
            const p = polar(((i + 0.5) / L) * 360, R - SW - 5)
            const active = i + 1 === curDay
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={active ? 1.6 : 0.9}
                fill={active ? moonColor : night ? 'rgba(255,255,255,0.28)' : 'var(--line-2)'}
                style={{ transition: 'all .3s' }}
              />
            )
          })}
        {/* phase arcs */}
        {arcs.map((a) => (
          <path
            key={a.phase}
            d={a.d}
            fill="none"
            stroke={PHASES[a.phase].color}
            strokeWidth={SW}
            strokeLinecap="round"
            style={{
              opacity: a.phase === phase ? 1 : night ? 0.32 : 0.28,
              transition: 'opacity .6s ease',
              filter: a.phase === phase && night ? `drop-shadow(0 0 6px ${PHASES[a.phase].color})` : undefined,
            }}
          />
        ))}
      </svg>

      {/* moon — an HTML layer rotated around the ring centre */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ rotate: angle }}>
        <span
          className="absolute left-1/2 rounded-full"
          style={{
            width: `${dotSizePct}%`,
            height: `${dotSizePct}%`,
            top: `${((100 - R) / 200) * 100 - dotSizePct / 2}%`,
            transform: 'translateX(-50%)',
            background: night ? '#fff' : 'var(--surface)',
            border: `3px solid ${moonColor}`,
            boxShadow: night
              ? `0 0 0 4px ${moonColor}55, 0 0 24px 6px ${moonColor}aa, 0 0 60px 12px ${moonColor}55`
              : `0 0 0 4px ${moonColor}22, 0 6px 18px ${moonColor}66`,
            transition: 'border-color .5s, box-shadow .5s',
          }}
        />
      </motion.div>

      <div className="absolute inset-[22%] flex flex-col items-center justify-center text-center">{center?.(curDay, phase)}</div>
    </div>
  )
}
