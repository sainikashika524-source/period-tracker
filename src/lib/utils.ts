import { clsx, type ClassValue } from 'clsx'

export const cn = (...v: ClassValue[]) => clsx(v)

/** Local yyyy-MM-dd (never UTC-shifted). */
export function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
/** Parse yyyy-MM-dd as a local date at noon (DST-safe). */
export function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export function daysBetween(a: Date, b: Date) {
  const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((B - A) / 86400000)
}
export const today = () => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d
}
export function fmt(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const date = typeof d === 'string' ? parseISO(d) : d
  return date.toLocaleDateString(undefined, opts)
}
export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
export function errorMessage(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Something went wrong. Check your connection and try again.'
}
