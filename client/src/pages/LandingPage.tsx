
import { Link } from 'react-router-dom'

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
    features: ['All Starter features', 'Advanced models', 'Priority support', 'Analytics dashboard'],
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
  {
    icon: '⚡',
    title: 'Blazing Fast',
    description: 'Sub-second responses powered by the best free AI providers globally.',
  },
  {
    icon: '🔑',
    title: 'One API Key',
    description: 'One key, 20+ AI models. No juggling multiple provider accounts.',
  },
  {
    icon: '🇰🇪',
    title: 'Built for Kenya',
    description: 'Pay in KES via M-Pesa or card. No USD conversion headaches.',
  },
  {
    icon: '🛡️',
    title: 'Reliable Routing',
    description: 'Automatic failover across providers. If one goes down, another takes over.',
  },
  {
    icon: '📊',
    title: 'Usage Analytics',
    description: 'Track every request, token, and cost in real time.',
  },
  {
    icon: '🔌',
    title: 'OpenAI Compatible',
    description: 'Drop-in replacement. Works with any OpenAI SDK or tool.',
  },
]

export default function LandingPage() {
  

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-foreground" />
            <span className="font-semibold tracking-tight text-sm">Cotell AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 ml-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/dashboard" className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:opacity-80 transition-opacity"
            >
              Get started
            </a>
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
          <a
            href="#pricing"
            className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-3 hover:opacity-80 transition-opacity"
          >
            Start free — no card needed
          </a>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border text-sm font-medium px-6 py-3 hover:bg-muted transition-colors"
          >
            Go to dashboard →
          </Link>
        </div>

        {/* Code snippet */}
        <div className="mt-14 rounded-2xl border bg-muted/50 p-6 text-left max-w-2xl mx-auto font-mono text-xs leading-relaxed overflow-x-auto">
          <div className="text-muted-foreground mb-1"># Drop-in OpenAI replacement</div>
          <div><span className="text-blue-400">from</span> openai <span className="text-blue-400">import</span> OpenAI</div>
          <div className="mt-2">client = OpenAI(</div>
          <div className="pl-4">base_url=<span className="text-green-400">"https://keen-fascination-production-5c08.up.railway.app/v1"</span>,</div>
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
              <Link
                to="/dashboard"
                className={`inline-flex items-center justify-center rounded-lg text-sm font-medium px-4 py-2.5 transition-opacity hover:opacity-80 ${
                  plan.highlight
                    ? 'bg-background text-foreground'
                    : 'bg-foreground text-background'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Docs */}
      <section id="docs" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-2xl border bg-muted/40 p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">Ready in 60 seconds</h2>
          <p className="text-muted-foreground mb-8">Get your API key, swap the base URL, and you're live.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Sign up', desc: 'Create a free account. No card required.' },
              { step: '2', title: 'Get your key', desc: 'Copy your cotell-xxx API key from the dashboard.' },
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
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-3 hover:opacity-80 transition-opacity"
            >
              Create free account →
            </Link>
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
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cotell AI. Built in Kenya 🇰🇪
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
