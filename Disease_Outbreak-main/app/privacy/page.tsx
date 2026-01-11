import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - EpiGuard',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur shadow-2xl">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)}</p>
        </header>

        <section className="space-y-3 text-sm leading-6">
          <p>

          </p>

          <h2 className="text-base font-semibold">Data we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium">Account data</span>: email, name, and authentication identifiers (when you sign in).
            </li>
            <li>
              <span className="font-medium">Alert settings</span>: selected state, daily digest preference, and (optional) Telegram chat link.
            </li>
            <li>
              <span className="font-medium">Community reports</span>: reports you submit in the app (content and region).
            </li>
            <li>
              <span className="font-medium">Technical data</span>: basic logs needed to operate APIs (e.g., error logs).
            </li>
          </ul>



          <h2 className="text-base font-semibold">How we use data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide dashboard features and personalize your selected region/state.</li>
            <li>Send alerts you opt into (browser notifications and/or Telegram).</li>
            <li>Improve reliability, prevent abuse, and debug issues.</li>
          </ul>

          <h2 className="text-base font-semibold">Telegram alerts</h2>
          <p>
            If you link Telegram, we store your Telegram chat link details (e.g., chat ID and optional username) so we can send you a
            state update when you open the bot from the app (and optionally a daily digest, if enabled).
          </p>

          <h2 className="text-base font-semibold">Data retention</h2>
          <p>
            We retain account and alert settings while your account is active. You can clear local data from Settings; server-side account
            data can be removed by deleting your account (feature availability may vary by deployment).
          </p>

          <h2 className="text-base font-semibold">Contact</h2>
          <p>
            For privacy questions, contact the app owner/administrator.
          </p>
        </section>

        <footer className="flex items-center justify-between border-t border-border pt-4 text-sm">
          <Link href="/" className="text-primary hover:underline">
            Back to app
          </Link>
          <Link href="/terms" className="text-primary hover:underline">
            Terms
          </Link>
        </footer>
      </div>
    </main>
  )
}
