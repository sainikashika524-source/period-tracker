import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { Aurora, Logo } from '../components/Brand'
import { Button, ButtonLink, Card, Field } from '../components/ui'
import { errorMessage } from '../lib/utils'

export default function ResetPassword() {
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return setErr('Use at least 8 characters.')
    if (pw !== pw2) return setErr('The two passwords don’t match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr(errorMessage(error))
    toast.success('Password updated.')
    nav('/app', { replace: true })
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg px-4">
      <Aurora className="opacity-70" />
      <Card className="relative w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Choose a new password</h1>
        {!loading && !user ? (
          <>
            <p className="mt-2 text-muted">This reset link has expired or was already used. Request a new one from the sign-in page.</p>
            <ButtonLink to="/login" className="mt-6 w-full">
              Back to sign in
            </ButtonLink>
          </>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <Field label="New password" type="password" icon={<Lock size={18} />} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Field label="Repeat new password" type="password" icon={<Lock size={18} />} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} error={err} />
            <Button type="submit" size="lg" loading={busy} className="mt-3 w-full">
              Update password
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
