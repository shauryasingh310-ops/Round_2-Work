'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getProviders, signIn } from 'next-auth/react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function AppLogo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center font-semibold">E</div>
      <div className="leading-tight">
        <div className="text-base font-semibold">EpiGuard</div>
        <div className="text-xs text-muted-foreground">Disease outbreak monitoring</div>
      </div>
    </div>
  )
}

function SignUpPageInner() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [availableProviders, setAvailableProviders] = useState<Record<string, { id: string; name: string }>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const providers = await getProviders()
      if (!providers || cancelled) return
      const map: Record<string, { id: string; name: string }> = {}
      for (const p of Object.values(providers)) {
        map[p.id] = { id: p.id, name: p.name }
      }
      setAvailableProviders(map)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const googleEnabled = Boolean(availableProviders.google)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      setError('Email and password are required.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: trimmedEmail, password }),
        })

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as any
          const details = typeof payload?.details === 'string' ? ` (${payload.details})` : ''
          setError((payload?.error || 'Registration failed.') + details)
          return
        }

        const result = await signIn('credentials', {
          email: trimmedEmail,
          password,
          callbackUrl,
          redirect: false,
        })

        if (result?.error) {
          setError(result.error === 'CredentialsSignin' ? 'Invalid email or password.' : result.error)
          return
        }

        // Use a hard navigation so we don't get stuck with a prefetched unauthenticated response
        // that middleware redirects back to /sign-in.
        window.location.assign(result?.url || callbackUrl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Registration failed.')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <AppLogo />
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
                  <p className="text-sm text-muted-foreground">Sign up to use EpiGuard</p>
                </div>
              </div>

              {error && (
                <Alert className="border-red-500/40 bg-red-500/10">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="default"
                  className="relative w-full overflow-hidden bg-gradient-to-r from-primary/90 via-primary/70 to-primary/90 text-primary-foreground shadow-lg transition-shadow duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40"
                  disabled={!googleEnabled}
                  onClick={() => (googleEnabled ? void signIn('google', { callbackUrl }) : undefined)}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 opacity-60 blur-lg animate-pulse"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 transition-opacity duration-300 hover:opacity-100"
                  />
                  <span className="relative">Continue with Google</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name (optional)</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? 'Creating…' : 'Create account'}
                  </Button>
                </form>
              </div>

              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/sign-in" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center bg-muted">
            <div className="relative h-full w-full p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
              <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-muted-foreground/10" />
              <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-muted-foreground/10" />
              <div className="relative z-10 flex h-full items-end">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Create your EpiGuard account</div>
                  <div className="text-sm text-muted-foreground">
                    Sign up with Google or email to start tracking outbreaks.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpPageInner />
    </Suspense>
  )
}
