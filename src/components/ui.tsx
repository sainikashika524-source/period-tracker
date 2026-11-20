import { forwardRef, useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, X } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../lib/utils'

// ── Button ─────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'lav' | 'dark' | 'soft' | 'danger' | 'white' | 'plum'
const variants: Record<Variant, string> = {
  primary: 'bg-rose text-white shadow-[0_10px_24px_-10px_rgba(232,80,122,.7)] hover:bg-rose-deep',
  lav: 'bg-lav text-white shadow-[0_10px_24px_-10px_rgba(139,92,246,.7)] hover:bg-lav-deep',
  dark: 'bg-plum text-white hover:bg-plum-2 dark:bg-white dark:text-plum dark:hover:bg-white/90',
  secondary: 'border border-line-2 bg-surface text-ink hover:border-rose/40 hover:bg-rose-soft/40',
  soft: 'bg-rose-soft text-rose-deep hover:bg-rose-soft/70 dark:text-rose',
  ghost: 'text-ink-2 hover:bg-rose-soft/60 hover:text-ink',
  danger: 'bg-[#c0283f] text-white hover:bg-[#a51f35]',
  white: 'bg-white text-lav-deep hover:bg-white/90',
  plum: 'bg-plum text-white hover:bg-plum-2',
}
const sizes = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-13 px-7 text-base' }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof sizes
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-all duration-200 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      <span className={cn('inline-flex items-center gap-2 transition-opacity', loading && 'opacity-0')}>{children}</span>
      {loading && <Dots className="absolute" />}
    </button>
  )
})

export function ButtonLink({ to, variant = 'primary', size = 'md', className, children }: { to: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-all duration-200 active:scale-[.97]', variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  )
}

export function Dots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex gap-1', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

// ── Layout bits ────────────────────────────────────────────────
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-3xl border border-line bg-surface shadow-soft', className)} {...rest}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, tone = 'lav', className }: { children: ReactNode; tone?: 'lav' | 'rose'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[.14em] uppercase',
        tone === 'lav' ? 'bg-lav-soft text-lav-deep dark:text-[#c4b0ff]' : 'bg-rose-soft text-rose-deep dark:text-rose',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function IconTile({ children, tone = 'rose', className }: { children: ReactNode; tone?: 'rose' | 'lav' | 'peach' | 'white'; className?: string }) {
  const t = {
    rose: 'bg-rose-soft text-rose',
    lav: 'bg-lav-soft text-lav',
    peach: 'bg-[#ffede4] text-[#e07a55] dark:bg-[#3a2018]',
    white: 'bg-surface text-rose',
  }[tone]
  return <span className={cn('inline-flex size-12 items-center justify-center rounded-2xl', t, className)}>{children}</span>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function Chip({
  active,
  children,
  onClick,
  className,
  color,
  ...rest
}: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string; color?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all active:scale-[.96]',
        active ? 'border-transparent text-white shadow-[0_8px_18px_-10px_rgba(232,80,122,.9)]' : 'border-line-2 bg-surface text-ink-2 hover:border-rose/40 hover:text-ink',
        className,
      )}
      style={active ? { background: color ?? '#E8507A' } : undefined}
      {...rest}
    >
      {children}
    </button>
  )
}

// ── Floating-label field ───────────────────────────────────────
interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  error?: string | null
  hint?: ReactNode
  icon?: ReactNode
  trailing?: ReactNode
}
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, icon, trailing, className, type = 'text', id, ...rest }, ref) {
  const autoId = useId()
  const fid = id ?? autoId
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <div className={className}>
      <div
        className={cn(
          'group relative flex items-center rounded-2xl border bg-surface-2 transition-all duration-200',
          error ? 'border-[#e24a5f] ring-4 ring-[#e24a5f]/10' : 'border-line-2 focus-within:border-rose focus-within:ring-4 focus-within:ring-rose/15',
        )}
      >
        {icon && <span className="pointer-events-none pl-4 text-muted transition-colors group-focus-within:text-rose">{icon}</span>}
        <input
          ref={ref}
          id={fid}
          type={isPw && show ? 'text' : type}
          placeholder=" "
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : undefined}
          className={cn('peer h-14 w-full bg-transparent px-4 pt-5 pb-1.5 text-[15px] text-ink outline-none placeholder:text-transparent', icon && 'pl-3')}
          {...rest}
        />
        <label
          htmlFor={fid}
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[15px] text-muted transition-all duration-200',
            'peer-focus:top-[15px] peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-rose',
            'peer-[:not(:placeholder-shown)]:top-[15px] peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:tracking-wide',
            icon ? 'left-11' : 'left-4',
          )}
        >
          {label}
        </label>
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-rose-soft hover:text-rose"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={show ? 'off' : 'on'} initial={{ scale: 0.5, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0, rotate: 30 }} transition={{ duration: 0.18 }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
        {trailing}
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p key="e" id={`${fid}-err`} role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-1 pt-1.5 text-[13px] text-[#d63a52] dark:text-[#ff7a8e]">
            {error}
          </motion.p>
        ) : hint ? (
          <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-1 pt-1.5">
            {hint}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
})

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-2.5 block text-sm font-semibold text-ink', className)}>
      {children}
    </label>
  )
}

export const inputCls =
  'h-12 w-full rounded-2xl border border-line-2 bg-surface-2 px-4 text-[15px] text-ink outline-none transition focus:border-rose focus:ring-4 focus:ring-rose/15 placeholder:text-muted'

// ── Sheet: bottom sheet on mobile, centred dialog on desktop ───
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-plum/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-2xl sm:max-w-lg sm:rounded-[28px]"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-2 sm:hidden" />
            <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-3 sm:pt-6">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-rose-soft hover:text-rose" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-6">{children}</div>
            {footer && <div className="border-t border-line bg-surface px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <IconTile className="mb-4 size-14">{icon}</IconTile>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[15px] text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, children, center }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', center && 'flex-col items-center text-center')}>
      <div>
        <h1 className="text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">{title}</h1>
        {sub && <p className="mt-2 text-[15px] text-muted sm:text-base">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
