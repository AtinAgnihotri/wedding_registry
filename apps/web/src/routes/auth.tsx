import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Turnstile } from '#/components/turnstile'
import { authClient, turnstileHeaders } from '#/lib/auth-client'
import { claimMyReservations, getSession } from '#/server/session.functions'

export const Route = createFileRoute('/auth')({
  loader: () => getSession(),
  component: AuthPage,
})

/** Bare login shell. Cursor owns the real auth sheet; this only proves the wiring. */
function AuthPage() {
  const { user, authEnabled, socialProviders } = Route.useLoaderData()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [status, setStatus] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string>()
  const [turnstileReset, setTurnstileReset] = useState(0)

  const fullPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`

  async function afterLogin() {
    await claimMyReservations()
    await router.invalidate()
  }

  if (!authEnabled) {
    return (
      <main className="space-y-4 p-6">
        <p>
          Login is not configured (DATABASE_URL / BETTER_AUTH_SECRET missing).
          Guests can still reserve.
        </p>
        <Link to="/" className="underline">
          Back to registry
        </Link>
      </main>
    )
  }

  if (user) {
    return (
      <main className="space-y-4 p-6">
        <p data-testid="signed-in">
          Signed in as {user.name} {user.phoneNumber ?? user.email ?? ''}
        </p>
        <Button
          onClick={async () => {
            await authClient.signOut()
            await router.invalidate()
          }}
        >
          Sign out
        </Button>
        <Link to="/" className="block underline">
          Back to registry
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">Log in (optional)</h1>
      {status ? <p role="status">{status}</p> : null}

      {!sent ? (
        <form
          className="space-y-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setStatus('')
            const { error } = await authClient.phoneNumber.sendOtp(
              { phoneNumber: fullPhone },
              { headers: turnstileHeaders(turnstileToken) },
            )
            setTurnstileReset((n) => n + 1)
            if (error) setStatus(error.message ?? 'Could not send code.')
            else setSent(true)
          }}
        >
          <label className="flex items-center gap-2">
            <span>+91</span>
            <Input
              name="phone"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <Turnstile
            action="otp"
            resetKey={turnstileReset}
            onToken={setTurnstileToken}
          />
          <Button type="submit">Send code</Button>
        </form>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setStatus('')
            const { error } = await authClient.phoneNumber.verify({
              phoneNumber: fullPhone,
              code,
            })
            if (error) setStatus(error.message ?? 'Invalid code.')
            else await afterLogin()
          }}
        >
          <p>Code sent to {fullPhone}.</p>
          <Input
            name="code"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Button type="submit">Verify</Button>
          <Button type="button" variant="ghost" onClick={() => setSent(false)}>
            Change number
          </Button>
        </form>
      )}

      {socialProviders.map((provider) => (
        <Button
          key={provider}
          variant="outline"
          className="block"
          onClick={() =>
            authClient.signIn.social({ provider, callbackURL: '/auth' })
          }
        >
          Continue with {provider === 'google' ? 'Google' : 'Facebook'}
        </Button>
      ))}
      <Link to="/" className="block underline">
        Skip — continue as guest
      </Link>
    </main>
  )
}
