import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Navigate, Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, CalendarDays, ChartColumn, House, Menu, Sparkles, UserRound, X } from 'lucide-react'
import { Logo, ThemeToggle } from './Brand'
import { ButtonLink } from './ui'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthProvider'
import { useProfile } from '../lib/queries'

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/learn', label: 'Learn' },
  { to: '/myths', label: 'Myths & Facts' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/feedback', label: 'Feedback' },
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function NavPills({ links, id }: { links: { to: string; label: string }[]; id: string }) {
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.to === '/' || l.to === '/app'} className="relative rounded-full px-4 py-2 text-[15px] font-medium">
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId={id} className="absolute inset-0 rounded-full bg-rose-soft" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className={cn('relative transition-colors', isActive ? 'text-rose-deep dark:text-rose' : 'text-ink-2 hover:text-ink')}>{l.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Avatar({ size = 36 }: { size?: number }) {
  const { data: p } = useProfile()
  const { user } = useAuth()
  const name = p?.display_name || user?.email || '?'
  const src = p?.avatar_url
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover ring-2 ring-rose-soft" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-gradient-to-br from-rose to-lav font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name[0]?.toUpperCase()}
    </span>
  )
}

function MobileMenu({ links, open, onClose }: { links: { to: string; label: string }[]; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-plum/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="absolute inset-x-3 top-3 rounded-[28px] border border-line bg-surface p-4 shadow-2xl"
            initial={{ y: -20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -20, scale: 0.97, opacity: 0 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <Logo />
              <button onClick={onClose} aria-label="Close menu" className="grid size-10 place-items-center rounded-full hover:bg-rose-soft">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col py-2">
              {links.map((l, i) => (
                <motion.div key={l.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                  <NavLink
                    to={l.to}
                    end={l.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) => cn('block rounded-2xl px-4 py-3 text-[17px] font-medium', isActive ? 'bg-rose-soft text-rose-deep dark:text-rose' : 'text-ink-2')}
                  >
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-4">
              {user ? (
                <ButtonLink to="/app" className="col-span-2">
                  Open my tracker
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/login" variant="secondary">
                    Sign in
                  </ButtonLink>
                  <ButtonLink to="/login?mode=signup">Start tracking</ButtonLink>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Navbar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={cn('sticky top-0 z-40 transition-all duration-300', scrolled ? 'border-b border-line bg-bg/80 backdrop-blur-xl' : 'border-b border-transparent')}>
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <NavPills links={PUBLIC_LINKS} id="pub-nav" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <Link to="/app" className="hidden items-center gap-2 rounded-full border border-line-2 bg-surface py-1 pr-4 pl-1 text-sm font-semibold transition hover:border-rose/40 sm:inline-flex">
              <Avatar size={30} /> My tracker
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <ButtonLink to="/login" variant="secondary" size="sm" className="h-10 px-5">
                Sign in
              </ButtonLink>
              <ButtonLink to="/login?mode=signup" size="sm" className="h-10 px-5">
                Start tracking
              </ButtonLink>
            </div>
          )}
          <button className="grid size-10 place-items-center rounded-full hover:bg-rose-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </div>
      <MobileMenu links={PUBLIC_LINKS} open={open} onClose={() => setOpen(false)} />
    </header>
  )
}

export function Footer() {
  const col = (title: string, items: [string, string][]) => (
    <div>
      <h3 className="mb-4 font-semibold text-white">{title}</h3>
      <ul className="space-y-3">
        {items.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-[15px] text-[#d9bfcc] transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <footer className="bg-plum text-[#d9bfcc] dark:bg-[#10070c]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 pt-16 pb-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed">A student-built menstrual health awareness platform.</p>
        </div>
        {col('Explore', [
          ['Learn', '/learn'],
          ['Myths & Facts', '/myths'],
          ['Quiz', '/quiz'],
          ['Calendar', '/app/calendar'],
        ])}
        {col('Account', [
          ['Sign in', '/login'],
          ['Sign up', '/login?mode=signup'],
          ['Feedback', '/feedback'],
          ['Share via QR', '/share'],
        ])}
        <div>
          <h3 className="mb-4 font-semibold text-white">Project</h3>
          <p className="text-[15px]">2nd-year mini project</p>
          <p className="mt-3 text-[15px]">Educational information only — not a substitute for professional medical advice.</p>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] border-t border-white/10 px-4 py-6 text-center text-sm sm:px-6">© {new Date().getFullYear()} PeriodWise. Built for educational purposes.</div>
    </footer>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// ── Signed-in app shell ────────────────────────────────────────
const APP_TABS = [
  { to: '/app', label: 'Today', icon: House },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/insights', label: 'Insights', icon: ChartColumn },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
]

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  const { data: profile, isLoading } = useProfile()
  if (loading || (user && isLoading))
    return (
      <div className="grid min-h-dvh place-items-center">
        <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-rose">
          <Sparkles />
        </motion.div>
      </div>
    )
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />
  if (profile && !profile.onboarding_done && loc.pathname !== '/app/welcome') return <Navigate to="/app/welcome" replace />
  return <Outlet />
}

export function AppLayout() {
  const loc = useLocation()
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
      <ScrollTop />
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to="/app" />
          <NavPills links={APP_TABS.map(({ to, label }) => ({ to, label }))} id="app-nav" />
          <div className="flex items-center gap-1">
            <Link to="/" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-ink sm:block">
              Explore site
            </Link>
            <ThemeToggle />
            <Link to="/app/profile" aria-label="Profile" className="ml-1">
              <Avatar size={36} />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
          <Outlet />
        </motion.div>
      </main>
      {/* mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="App">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {APP_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/app'} className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-dot" className="absolute top-0 h-[3px] w-8 rounded-full bg-rose" />}
                  <Icon size={21} className={isActive ? 'text-rose' : 'text-muted'} strokeWidth={isActive ? 2.4 : 2} />
                  <span className={isActive ? 'text-rose-deep dark:text-rose' : 'text-muted'}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
