import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Mode = 'light' | 'dark' | 'system'
const Ctx = createContext<{ mode: Mode; dark: boolean; setMode: (m: Mode) => void }>({ mode: 'system', dark: false, setMode: () => {} })

function read(): Mode {
  try {
    const v = localStorage.getItem('pw-theme')
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(read)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const dark = mode === 'dark' || (mode === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#170b12' : '#E8507A')
  }, [dark])

  const setMode = (m: Mode) => {
    setModeState(m)
    try {
      if (m === 'system') localStorage.removeItem('pw-theme')
      else localStorage.setItem('pw-theme', m)
    } catch {
      /* storage blocked */
    }
  }
  return <Ctx.Provider value={{ mode, dark, setMode }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
