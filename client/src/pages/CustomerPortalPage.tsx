/**
 * Customer self-service portal.
 * Routes:
 *   /portal          — look up account by email
 *   /portal/verify   — Paystack callback after payment
 */
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type AccountInfo = {
  email: string
  name: string
  plan_name: string
  plan_slug: string
  sub_status: string
  current_period_end: string
  key_prefix: string
}

function VerifyPage() {
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? ''
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!ref) { setState('error'); setMessage('No payment reference found.'); return }
    fetch(`/api/saas/payment/verify?ref=${encodeURIComponent(ref)}`)
      .then(r => r.json())
      .then((d: { success?: boolean; apiKey?: string; error?: string }) => {
        if (d.success) {
          setState('success')
          setApiKey(d.apiKey ?? '')
        } else {
          setState('error')
          setMessage(d.error ?? 'Verification failed')
        }
      })
      .catch(() => { setState('error'); setMessage('Network error — please try again.') })
  }, [ref])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
        {state === 'loading' && (
          <>
            <div className="size-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Verifying your payment…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="font-semibold text-xl mb-2">Payment successful!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your subscription is now active.</p>
            {apiKey && (
              <div className="rounded-lg border bg-muted p-4 text-left mb-6">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Your API key — save it now, shown only once:</p>
                <code className="text-xs font-mono break-all select-all block">{apiKey}</code>
              </div>
            )}
            <div className="rounded-lg bg-muted p-4 text-left mb-6">
              <p className="text-xs text-muted-foreground mb-1">Use it like this:</p>
              <code className="text-xs font-mono text-foreground">
                base_url = "{window.location.origin}/v1"<br />
                api_key = "{apiKey || 'cotell-your-key'}"
              </code>
            </div>
            <Link to="/portal" className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-5 py-2.5 hover:opacity-80 transition-opacity">
              View my account
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="font-semibold text-xl mb-2">Verification failed</h2>
            <p className="text-sm text-muted-foreground mb-6">{message}</p>
            <Link to="/" className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-5 py-2.5 hover:opacity-80 transition-opacity">
              Go back home
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

function AccountLookup() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'error'>('idle')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [error, setError] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/saas/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const d = await res.json() as AccountInfo & { error?: string }
      if (!res.ok) throw new Error(d.error ?? 'Not found')
      setAccount(d)
      setState('found')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const periodEnd = account?.current_period_end
    ? new Date(account.current_period_end).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <span className="inline-block size-2 rounded-full bg-foreground" />
            <span className="font-semibold tracking-tight text-sm">Cotell AI</span>
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm">My Account</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {state !== 'found' ? (
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-semibold mb-2">My Account</h1>
            <p className="text-muted-foreground text-sm mb-8">Enter your email to look up your subscription and API key prefix.</p>
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                />
              </div>
              {state === 'error' && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={state === 'loading'}
                className="w-full rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2.5 hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {state === 'loading' ? 'Looking up…' : 'Look up account'}
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              No account yet? <Link to="/#pricing" className="underline hover:text-foreground">Get started free →</Link>
            </p>
          </div>
        ) : account && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Welcome back{account.name ? `, ${account.name.split(' ')[0]}` : ''}</h1>
              <p className="text-sm text-muted-foreground mt-1">{account.email}</p>
            </div>

            {/* Subscription card */}
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current plan</p>
                  <p className="text-xl font-semibold">{account.plan_name ?? 'No active plan'}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  account.sub_status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'
                }`}>
                  {account.sub_status ?? 'inactive'}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Renews</p>
                  <p className="text-sm font-medium mt-0.5">{periodEnd}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API key prefix</p>
                  <p className="text-sm font-mono mt-0.5">{account.key_prefix}…</p>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-medium mb-4">Quick start</h3>
              <div className="rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                <div className="text-muted-foreground"># Python (OpenAI SDK)</div>
                <div className="mt-1"><span className="text-blue-400">from</span> openai <span className="text-blue-400">import</span> OpenAI</div>
                <div className="mt-1">client = OpenAI(</div>
                <div className="pl-4">base_url=<span className="text-green-400">"{window.location.origin}/v1"</span>,</div>
                <div className="pl-4">api_key=<span className="text-green-400">"{account.key_prefix}…"</span>,</div>
                <div>)</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setState('idle'); setAccount(null) }} className="rounded-lg border text-sm font-medium px-4 py-2.5 hover:bg-muted transition-colors">
                Look up different email
              </button>
              <Link to="/#pricing" className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2.5 hover:opacity-80 transition-opacity inline-flex items-center justify-center">
                Upgrade plan →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CustomerPortalPage() {
  const [params] = useSearchParams()
  if (params.has('ref')) return <VerifyPage />
  return <AccountLookup />
}
