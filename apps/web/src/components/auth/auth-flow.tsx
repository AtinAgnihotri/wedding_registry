import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Turnstile } from '#/components/turnstile'
import {
  field,
  fieldLabel,
  ghostButton,
  primaryButton,
} from '#/components/registry/styles'
import { useTurnstileToken } from '#/components/registry/use-turnstile-token'
import { authClient, turnstileHeaders } from '#/lib/auth-client'
import { cn } from '#/lib/utils'
import { claimMyReservations } from '#/server/session.functions'
import type { getSession } from '#/server/session.functions'

export type SessionInfo = Awaited<ReturnType<typeof getSession>>

/** Set before an OAuth redirect so the return trip knows to claim guest reservations. */
const SOCIAL_CLAIM_FLAG = 'wr-claim-after-social-login'

const providerLabel = { google: 'Google', facebook: 'Facebook' } as const

/** Keeps only the 10-digit national number, tolerating a pasted +91 / 0 prefix. */
function toNationalNumber(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

/** Refreshes everything that depends on who is signed in. */
function useRefreshSession() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['session'] }),
      queryClient.invalidateQueries({ queryKey: ['gifts'] }),
    ])
    await router.invalidate()
  }
}

function useAfterLogin() {
  const refresh = useRefreshSession()
  return async () => {
    try {
      await claimMyReservations()
    } finally {
      await refresh()
    }
  }
}

/** Finishes a Google/Facebook login once the browser lands back on the site. */
export function useCompleteSocialLogin(signedIn: boolean) {
  const afterLogin = useAfterLogin()
  const ran = useRef(false)
  useEffect(() => {
    if (!signedIn || ran.current) return
    if (sessionStorage.getItem(SOCIAL_CLAIM_FLAG) !== '1') return
    ran.current = true
    sessionStorage.removeItem(SOCIAL_CLAIM_FLAG)
    void afterLogin().catch(() => undefined)
  }, [signedIn, afterLogin])
}

function StatusMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-sm font-semibold text-destructive"
    >
      {message}
    </p>
  )
}

/**
 * Phone OTP first, then Google/Facebook. Shared by the registry's sign-in sheet and
 * the `/auth` fallback page. Never required: guests can always skip.
 */
export function AuthFlow({
  session,
  callbackURL,
  guestAction,
}: {
  session: SessionInfo
  callbackURL: string
  /** "Continue as guest" control; closes the sheet or links back to the registry. */
  guestAction: React.ReactNode
}) {
  const { user, socialProviders } = session
  const afterLogin = useAfterLogin()
  const refresh = useRefreshSession()
  const turnstile = useTurnstileToken()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const fullPhone = `+91${phone}`

  if (user) {
    return (
      <div className="grid gap-5" data-testid="signed-in">
        <div className="rounded-lg border border-gold/30 bg-champagne/35 p-4">
          <p className="text-sm font-semibold text-ink-muted">Signed in as</p>
          <p className="mt-1 font-display text-2xl leading-tight text-ink">
            {user.name || user.phoneNumber || user.email}
          </p>
          {user.name && (user.phoneNumber || user.email) ? (
            <p className="mt-1 text-sm text-ink-muted">
              {user.phoneNumber ?? user.email}
            </p>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          Gifts you reserve while signed in stay linked to your account, so you
          can release them from any device.
        </p>
        <StatusMessage message={status} />
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button
            type="button"
            className={ghostButton}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setStatus('')
              try {
                const { error } = await authClient.signOut()
                if (error) setStatus(error.message ?? 'Could not sign out.')
                else await refresh()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Signing out...' : 'Sign out'}
          </Button>
          {guestAction}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {step === 'phone' ? (
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setStatus('')
            if (!/^[6-9]\d{9}$/.test(phone)) {
              setStatus('Enter your 10-digit Indian mobile number.')
              return
            }
            setBusy(true)
            try {
              const { error } = await authClient.phoneNumber.sendOtp(
                { phoneNumber: fullPhone },
                { headers: turnstileHeaders(turnstile.consume()) },
              )
              if (error) setStatus(error.message ?? 'Could not send code.')
              else {
                setCode('')
                setStep('code')
              }
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="auth-phone" className={fieldLabel}>
              Mobile number
            </Label>
            <div className="flex">
              <span className="inline-flex h-11 items-center rounded-l-md border border-r-0 border-line bg-mist px-3.5 text-[0.95rem] font-bold text-emerald-dark">
                +91
              </span>
              <Input
                id="auth-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(toNationalNumber(e.target.value))}
                required
                className={cn(field, 'rounded-l-none')}
              />
            </div>
            <p className="text-[0.82rem] text-ink-muted">
              We&apos;ll text you a 6-digit code.
            </p>
          </div>
          <Turnstile
            action="otp"
            resetKey={turnstile.resetKey}
            onToken={turnstile.setToken}
          />
          <StatusMessage message={status} />
          <Button type="submit" className={primaryButton} disabled={busy}>
            {busy ? 'Sending...' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setStatus('')
            setBusy(true)
            try {
              const { error } = await authClient.phoneNumber.verify({
                phoneNumber: fullPhone,
                code,
              })
              if (error) setStatus(error.message ?? 'Invalid code.')
              else await afterLogin()
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="auth-code" className={fieldLabel}>
              Code sent to {fullPhone}
            </Label>
            <Input
              id="auth-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              className={cn(field, 'text-lg tracking-[0.3em]')}
            />
          </div>
          <StatusMessage message={status} />
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button type="submit" className={primaryButton} disabled={busy}>
              {busy ? 'Verifying...' : 'Verify'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-full px-4 font-bold text-emerald-dark hover:bg-mist"
              onClick={() => {
                setStatus('')
                setStep('phone')
              }}
            >
              Change number
            </Button>
          </div>
        </form>
      )}

      {socialProviders.length ? (
        <div className="grid gap-3">
          <div className="flex items-center gap-3 text-[0.78rem] font-bold tracking-[0.1em] text-ink-muted uppercase">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          {socialProviders.map((provider) => (
            <Button
              key={provider}
              type="button"
              className={cn(ghostButton, 'w-full hover:translate-y-0')}
              onClick={async () => {
                setStatus('')
                sessionStorage.setItem(SOCIAL_CLAIM_FLAG, '1')
                const { error } = await authClient.signIn.social({
                  provider,
                  callbackURL,
                })
                if (error) {
                  sessionStorage.removeItem(SOCIAL_CLAIM_FLAG)
                  setStatus(error.message ?? 'Could not start sign in.')
                }
              }}
            >
              Continue with {providerLabel[provider]}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="border-t border-line pt-4 text-center">{guestAction}</div>
    </div>
  )
}
