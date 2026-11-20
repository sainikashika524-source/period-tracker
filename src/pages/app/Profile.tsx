import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, LogOut, Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Chip, Label, PageHeader, Sheet, inputCls } from '../../components/ui'
import { useAuth } from '../../context/AuthProvider'
import { useTheme } from '../../context/ThemeProvider'
import { useCycles, useLogs, useProfile, useUpdateProfile } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import { errorMessage, iso, today } from '../../lib/utils'

const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45+']

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { data: p } = useProfile()
  const update = useUpdateProfile()
  const { data: cycles = [] } = useCycles()
  const { data: logs = [] } = useLogs()
  const { mode, setMode } = useTheme()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [age, setAge] = useState<string | null>(null)
  const [cycle, setCycle] = useState(28)
  const [period, setPeriod] = useState(5)
  const [confirm, setConfirm] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!p) return
    setName(p.display_name ?? '')
    setAge(p.age_group)
    setCycle(p.avg_cycle_length)
    setPeriod(p.avg_period_length)
  }, [p])

  const dirty = p && (name !== (p.display_name ?? '') || age !== p.age_group || cycle !== p.avg_cycle_length || period !== p.avg_period_length)

  async function save() {
    try {
      await update.mutateAsync({ display_name: name.trim() || null, age_group: age, avg_cycle_length: cycle, avg_period_length: period })
      toast.success('Profile saved.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  function exportData() {
    const stamp = iso(today())
    download(`periodwise-periods-${stamp}.csv`, csv(cycles.map(({ start_date, end_date, notes }) => ({ start_date, end_date, notes }))))
    if (logs.length)
      download(
        `periodwise-daily-logs-${stamp}.csv`,
        csv(logs.map(({ date, flow, symptoms, mood, energy, pain_level, water_glasses, sleep_hours, notes }) => ({ date, flow, symptoms, mood, energy, pain_level, water_glasses, sleep_hours, notes }))),
      )
    toast.success(`Exported ${cycles.length} periods and ${logs.length} daily logs.`)
  }

  async function deleteAccount() {
    setDeleting(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleting(false)
      return toast.error(errorMessage(error))
    }
    await signOut()
    toast.success('Your account and all your data were deleted.')
    nav('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" sub={user?.email} />
      <div className="space-y-5">
        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold">About you</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="pname">Display name</Label>
              <input id="pname" className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Age group</Label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map((a) => (
                  <Chip key={a} className="h-9" active={age === a} onClick={() => setAge(age === a ? null : a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="pcycle">Typical cycle length (days)</Label>
              <input id="pcycle" type="number" min={15} max={60} className={inputCls} value={cycle} onChange={(e) => setCycle(Math.min(60, Math.max(15, +e.target.value || 28)))} />
            </div>
            <div>
              <Label htmlFor="pperiod">Typical period length (days)</Label>
              <input id="pperiod" type="number" min={1} max={15} className={inputCls} value={period} onChange={(e) => setPeriod(Math.min(15, Math.max(1, +e.target.value || 5)))} />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">These are used until you’ve logged 3+ periods — after that, predictions use your real average.</p>
          <Button className="mt-6" disabled={!dirty} loading={update.isPending} onClick={save}>
            Save changes
          </Button>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
            {(
              [
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
                ['system', 'System', Monitor],
              ] as const
            ).map(([m, l, Icon]) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm font-medium transition ${mode === m ? 'border-rose bg-rose-soft text-rose-deep dark:text-rose' : 'border-line-2 text-ink-2 hover:border-rose/40'}`}>
                <Icon size={20} /> {l}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#3fae74]" />
            <h2 className="text-lg font-semibold">Your data</h2>
          </div>
          <p className="mt-2 text-sm text-muted">Your logs are protected by row-level security — only your signed-in account can read them. You can take a copy or erase everything at any time.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={exportData} disabled={!cycles.length && !logs.length}>
              <Download size={17} /> Export as CSV
            </Button>
            <Button variant="secondary" onClick={() => signOut().then(() => nav('/'))}>
              <LogOut size={17} /> Sign out
            </Button>
          </div>
        </Card>

        <Card className="border-[#f3c2cb] p-6 sm:p-8 dark:border-[#5a2030]">
          <h2 className="text-lg font-semibold text-[#c0283f] dark:text-[#ff8a9c]">Delete account</h2>
          <p className="mt-2 text-sm text-muted">Permanently deletes your account, profile, periods, daily logs and quiz history. This can’t be undone.</p>
          <Button variant="danger" className="mt-5" onClick={() => setConfirm(true)}>
            <Trash2 size={17} /> Delete my account
          </Button>
        </Card>
      </div>

      <Sheet
        open={confirm}
        onClose={() => {
          setConfirm(false)
          setTyped('')
        }}
        title="Delete your account?"
        footer={
          <Button variant="danger" size="lg" className="w-full" disabled={typed !== 'DELETE'} loading={deleting} onClick={deleteAccount}>
            Permanently delete
          </Button>
        }
      >
        <p className="text-[15px] text-ink-2">
          All {cycles.length} periods and {logs.length} daily logs will be erased. Type <strong className="font-mono">DELETE</strong> to confirm.
        </p>
        <input className={inputCls + ' mt-4 font-mono'} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" autoFocus />
      </Sheet>
    </div>
  )
}
