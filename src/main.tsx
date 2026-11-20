// Entry point. Checks build-time config before loading the app, so a missing
// env var shows a clear message instead of a blank screen.
const missing = (['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const).filter((k) => !import.meta.env[k])

if (missing.length) {
  const root = document.getElementById('root')!
  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Poppins,system-ui,sans-serif;background:#1a0f17;color:#f6e9ef">
      <div style="max-width:520px">
        <h1 style="font-size:22px;margin:0 0 12px">PeriodWise isn't configured yet</h1>
        <p style="margin:0 0 12px;line-height:1.6;opacity:.85">This build is missing: <code>${missing.join(', ')}</code>.</p>
        <p style="margin:0;line-height:1.6;opacity:.85">Add them in Vercel → Project → Settings → Environment Variables (Production), then redeploy. Locally, copy <code>.env.example</code> to <code>.env.local</code>.</p>
      </div>
    </div>`
  console.error('Missing env vars:', missing.join(', '))
} else {
  import('./bootstrap')
}
