import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - EpiGuard',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur shadow-2xl">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)}</p>
        </header>

        <section className="space-y-3 text-sm leading-6">
          <p>
            By using EpiGuard, you agree to these Terms.
          </p>

          <h2 className="text-base font-semibold">Health disclaimer</h2>
          <p>
            EpiGuard provides informational risk signals and is not medical advice. For urgent symptoms, contact local medical services.
          </p>

          <h2 className="text-base font-semibold">Acceptable use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not submit illegal, harmful, or abusive content.</li>
            <li>Do not attempt to disrupt the service or abuse APIs.</li>
          </ul>

          <h2 className="text-base font-semibold">Alerts</h2>
          <p>
            Alerts are best-effort and may be delayed or unavailable due to connectivity or upstream providers.
          </p>

          <h2 className="text-base font-semibold">Contact</h2>
          <p>
            For support, contact the app owner/administrator.
          </p>
        </section>

        <footer className="flex items-center justify-between border-t border-border pt-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link href="/" className="text-primary hover:underline">
            Back to app
          </Link>
        </footer>
      </div>
    </main>
  )
}
