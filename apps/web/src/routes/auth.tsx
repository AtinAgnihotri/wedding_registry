import { createFileRoute, Link } from '@tanstack/react-router'

import { AuthFlow, useCompleteSocialLogin } from '#/components/auth/auth-flow'
import { kicker } from '#/components/registry/styles'
import { cn } from '#/lib/utils'
import { getSession } from '#/server/session.functions'

export const Route = createFileRoute('/auth')({
  loader: () => getSession(),
  component: AuthPage,
})

const backLink =
  'inline-flex min-h-11 items-center px-2 font-bold text-berry underline-offset-4 hover:underline'

/** Fallback sign-in page; the registry normally opens the same flow in a sheet. */
function AuthPage() {
  const session = Route.useLoaderData()
  const { user, authEnabled } = session

  useCompleteSocialLogin(Boolean(user))

  return (
    <main className="mx-auto grid min-h-dvh w-[min(980px,calc(100%-22px))] items-center py-6 sm:w-[min(980px,calc(100%-32px))] sm:py-10">
      <div className="grid overflow-hidden rounded-lg border border-gold/35 bg-surface shadow-deep md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="wr-hero relative isolate flex min-h-[220px] flex-col justify-end p-6 sm:p-8 md:min-h-[520px]">
          <div className="wr-hero-text relative z-10">
            <p className="mb-2 text-[0.76rem] font-extrabold tracking-[0.14em] text-champagne uppercase">
              Wedding Gift Registry
            </p>
            <p
              aria-label="Mitthu and Atin"
              className="font-display text-[3rem] leading-[0.9] font-medium text-surface sm:text-[3.6rem]"
            >
              Mitthu{' '}
              <span aria-hidden="true" className="text-champagne italic">
                &amp;
              </span>{' '}
              Atin
            </p>
            <p className="mt-3 text-sm font-semibold text-surface/85">
              12 December 2026 · Sunahari Bagh Farm, Gurgaon
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-9">
          {!authEnabled ? (
            <div className="grid gap-4">
              <p className={kicker}>Sign in</p>
              <h1 className="font-display text-[2rem] leading-[1.05] font-medium text-ink">
                Login isn&apos;t available right now
              </h1>
              <p className="leading-relaxed text-ink-muted">
                You don&apos;t need an account. Guests can still browse,
                reserve, and suggest gifts.
              </p>
              <Link to="/" className={backLink}>
                Back to registry
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className={cn(kicker, 'mb-2.5')}>
                  {user ? 'Your account' : 'Optional'}
                </p>
                <h1 className="font-display text-[2rem] leading-[1.05] font-medium text-ink">
                  {user ? 'Welcome back' : 'Sign in to keep your gifts'}
                </h1>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
                  {user
                    ? 'You can keep browsing and reserving as usual.'
                    : 'Signing in lets you release your gifts from any device. You can always reserve as a guest.'}
                </p>
              </div>
              <AuthFlow
                session={session}
                callbackURL="/auth"
                guestAction={
                  <Link to="/" className={backLink}>
                    {user ? 'Back to registry' : 'Skip — continue as guest'}
                  </Link>
                }
              />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
