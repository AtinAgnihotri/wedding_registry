import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '#/components/ui/dialog'
import { kicker } from '#/components/registry/styles'
import { cn } from '#/lib/utils'
import { AuthFlow } from './auth-flow'
import type { SessionInfo } from './auth-flow'

/** Optional sign-in, as a bottom sheet on phones and a side sheet on desktop. */
export function AuthSheet({
  open,
  onOpenChange,
  session,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SessionInfo
}) {
  const signedIn = Boolean(session.user)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="wr-sheet fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-b-0 border-gold/30 bg-surface px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink shadow-deep outline-none sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-2xl sm:border-r-0 sm:border-b sm:px-8 sm:pt-10">
          <div
            aria-hidden="true"
            className="mx-auto -mt-2 mb-5 h-1 w-10 rounded-full bg-line sm:hidden"
          />
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 size-11 rounded-full text-ink-muted hover:bg-mist hover:text-ink"
            >
              <XIcon className="size-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>

          <div className="mb-6 pr-10">
            <p className={cn(kicker, 'mb-2.5')}>
              {signedIn ? 'Your account' : 'Optional'}
            </p>
            <DialogTitle className="font-display text-[2rem] leading-[1.05] font-medium text-ink">
              {signedIn ? 'Welcome back' : 'Sign in to keep your gifts'}
            </DialogTitle>
            <DialogDescription className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
              {signedIn
                ? 'You can keep browsing and reserving as usual.'
                : 'Signing in lets you release your gifts from any device. You can always reserve as a guest.'}
            </DialogDescription>
          </div>

          <AuthFlow
            session={session}
            callbackURL="/"
            guestAction={
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="link"
                  className="h-11 px-2 font-bold text-berry"
                >
                  {signedIn ? 'Back to the registry' : 'Continue as guest'}
                </Button>
              </DialogPrimitive.Close>
            }
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
