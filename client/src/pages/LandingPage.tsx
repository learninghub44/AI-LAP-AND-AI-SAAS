import { useState } from 'react'
import { Link } from 'react-router-dom'

const PLAN_SLUGS: Record<string, string> = {
  Free: 'free',
  Starter: 'starter-monthly',
  Pro: 'pro-monthly',
  Business: 'business-monthly',
}

const plans = [
  {
    name: 'Free',
    price: 'KES 0',
    period: '/mo',
    description: 'Try Cotell AI risk-free',
    requests: '100 requests',
    tokens: '250K tokens',
    features: ['Access to fast models', 'API key included', 'Community support'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: 'KES 1,500',
    period: '/mo',
    description: 'For solo developers',
    requests: '1,000 requests',
    tokens: '2M tokens',
    features: ['All Free features', 'Fast + balanced models', 'Email support'],
    cta: 'Start Starter',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'KES 4,500',
    period: '/mo',
    description: 'For growing teams',
    requests: '10,000 requests',
    tokens: '25M tokens',
    features: ['All Starter features', 'Advanced models', 'Priority support', 'Analytics'],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: 'KES 12,000',
    period: '/mo',
    description: 'For production apps',
    requests: '50,000 requests',
    tokens: '150M tokens',
    features: ['All Pro features', 'All model groups', 'Dedicated support', 'Custom limits'],
    cta: 'Start Business',
    highlight: false,
  },
]

const features = [
  { icon: '⚡', title: 'Blazing Fast', description: 'Sub-second responses powered by the best free AI providers globally.' },
  { icon: '🔑', title: 'One API Key', description: 'One key, 20+ AI models. No juggling multiple provider accounts.' },
  { icon: '🇰🇪', title: 'Built for Kenya', description: 'Pay in KES via M-Pesa or card. No USD conversion headaches.' },
  { icon: '🛡️', title: 'Reliable Routing', description: 'Automatic failover across providers. If one goes down, another takes over.' },
  { icon: '📊', title: 'Usage Analytics', description: 'Track every request, token, and cost in real time.' },
  { icon: '🔌', title: 'OpenAI Compatible', description: 'Drop-in replacement. Works with any OpenAI SDK or tool.' },
]

type SignupState = 'idle' | 'loading' | 'success' | 'error'

function SignupModal({ plan, onClose }: { plan: typeof plans[0]; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [state, setState] = useState<SignupState>('idle')
  const [message, setMessage] = useState('')
  const [apiKey, setApiKey] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')
    setMessage('')
    try {
      const res = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), planSlug: PLAN_SLUGS[plan.name] }),
      })
      const data = await res.json() as { type?: string; apiKey?: string; authorizationUrl?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Signup failed')

      if (data.type === 'free') {
        setApiKey(data.apiKey ?? '')
        setState('success')
        setMessage(`You're on the Free plan! Your API key is ready.`)
      } else if (data.type === 'payment' && data.authorizationUrl) {
        // Redirect to Paystack checkout
        window.location.href = data.authorizationUrl
      }
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-lg">Start {plan.name} plan</h2>
            <p className="text-sm text-muted-foreground">{plan.price}{plan.period}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        {state === 'success' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">🎉 Account created!</p>
              <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
            </div>
            {apiKey && (
              <div className="rounded-lg border bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1">Your API key — save it now, shown only once:</p>
                <code className="text-xs font-mono break-all select-all">{apiKey}</code>
              </div>
            )}
            <button onClick={onClose} className="w-full rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2.5 hover:opacity-80 transition-opacity">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Wanjiku"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address <span className="text-red-500">*</span></label>
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
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2.5 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {state === 'loading' ? 'Please wait…' : plan.name === 'Free' ? 'Create free account' : `Continue to payment (${plan.price})`}
            </button>
            {plan.name !== 'Free' && (
              <p className="text-xs text-muted-foreground text-center">Secure payment via Paystack · M-Pesa or card accepted</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-foreground" />
            <span className="font-semibold tracking-tight text-sm">Cotell AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 ml-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link to="/portal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">My Account</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/dashboard" className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
            <button
              onClick={() => setSelectedPlan(plans[0])}
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:opacity-80 transition-opacity"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground mb-8">
          <span className="inline-block size-1.5 rounded-full bg-green-500" />
          Live — serving requests now
        </div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-tight mb-6">
          AI API access,<br />
          <span className="text-muted-foreground">priced for Kenya</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          One API key. 20+ AI models. Pay in KES via M-Pesa or card.
          OpenAI-compatible — works with any existing AI tool or SDK.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setSelectedPlan(plans[0])}
            className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-3 hover:opacity-80 transition-opacity"
          >
            Start free — no card needed
          </button>
          <Link
            to="/portal"
            className="inline-flex items-center justify-center rounded-lg border text-sm font-medium px-6 py-3 hover:bg-muted transition-colors"
          >
            My account →
          </Link>
        </div>

        {/* Code snippet */}
        <div className="mt-14 rounded-2xl border bg-muted/50 p-6 text-left max-w-2xl mx-auto font-mono text-xs leading-relaxed overflow-x-auto">
          <div className="text-muted-foreground mb-1"># Drop-in OpenAI replacement</div>
          <div><span className="text-blue-400">from</span> openai <span className="text-blue-400">import</span> OpenAI</div>
          <div className="mt-2">client = OpenAI(</div>
          <div className="pl-4">base_url=<span className="text-green-400">"{window.location.origin}/v1"</span>,</div>
          <div className="pl-4">api_key=<span className="text-green-400">"cotell-your-key-here"</span>,</div>
          <div>)</div>
          <div className="mt-2">response = client.chat.completions.create(</div>
          <div className="pl-4">model=<span className="text-green-400">"auto"</span>,</div>
          <div className="pl-4">messages=[{"{"}role: <span className="text-green-400">"user"</span>, content: <span className="text-green-400">"Hello!"</span>{"}"}]</div>
          <div>)</div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-3">Everything you need</h2>
        <p className="text-muted-foreground text-center mb-12">Built for African developers. No USD billing, no VPN needed.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-medium mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-3">Simple pricing in KES</h2>
        <p className="text-muted-foreground text-center mb-12">Start free. Upgrade when you need more. Pay via M-Pesa or card.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.highlight ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
            >
              <div className="mb-4">
                <div className={`text-xs font-medium mb-1 ${plan.highlight ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-background/70' : 'text-muted-foreground'}`}>{plan.period}</span>
                </div>
                <p className={`text-xs mt-1 ${plan.highlight ? 'text-background/70' : 'text-muted-foreground'}`}>{plan.description}</p>
              </div>
              <div className={`text-xs font-medium mb-3 ${plan.highlight ? 'text-background/80' : 'text-muted-foreground'}`}>
                {plan.requests} · {plan.tokens}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className={plan.highlight ? 'text-background/70' : 'text-muted-foreground'}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelectedPlan(plan)}
                className={`inline-flex items-center justify-center rounded-lg text-sm font-medium px-4 py-2.5 transition-opacity hover:opacity-80 ${
                  plan.highlight ? 'bg-background text-foreground' : 'bg-foreground text-background'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quickstart */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-2xl border bg-muted/40 p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">Ready in 60 seconds</h2>
          <p className="text-muted-foreground mb-8">Get your API key, swap the base URL, and you're live.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Sign up', desc: 'Create a free account. No card required.' },
              { step: '2', title: 'Get your key', desc: 'Your cotell-xxx API key is issued instantly.' },
              { step: '3', title: 'Start building', desc: 'Point your OpenAI SDK to Cotell AI and go.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="flex-shrink-0 size-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                  {s.step}
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <button
              onClick={() => setSelectedPlan(plans[0])}
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-3 hover:opacity-80 transition-opacity"
            >
              Create free account →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-foreground" />
            <span className="font-semibold tracking-tight text-sm">Cotell AI</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Cotell AI · Built in Kenya 🇰🇪</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/portal" className="hover:text-foreground transition-colors">My Account</Link>
            <a href="mailto:support@cotell.co" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {selectedPlan && <SignupModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
    </div>
  )
}
