import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Turnstile } from '#/components/turnstile'
import { isGiftFull, MAX_RESERVATIONS_PER_GIFT } from '#/lib/gifts'
import type { Gift } from '#/lib/gifts'
import { cn } from '#/lib/utils'
import { field, fieldLabel, ghostButton, kicker, primaryButton } from './styles'
import { useTurnstileToken } from './use-turnstile-token'

export function ReserveDialog({
  open,
  gift,
  defaultName,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  /** Kept after closing so the exit animation still has content. */
  gift: Gift | undefined
  defaultName: string
  pending: boolean
  error: string
  onClose: () => void
  onSubmit: (data: {
    id: string
    guestName: string
    message: string
    turnstileToken: string | undefined
  }) => void
}) {
  const turnstile = useTurnstileToken()
  const count = gift?.reservations.length ?? 0
  const label = count > 0 ? 'Join Gift' : 'Reserve Gift'

  return (
    <Dialog open={open && !!gift} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-lg border-line bg-surface p-6 shadow-deep sm:max-w-[520px] sm:p-7">
        {gift ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              onSubmit({
                id: gift.id,
                guestName: String(form.get('guestName') ?? ''),
                message: String(form.get('message') ?? ''),
                turnstileToken: turnstile.consume(),
              })
            }}
          >
            <DialogHeader className="gap-0 pr-8 text-left">
              <p className={cn(kicker, 'mb-2.5')}>{label}</p>
              <DialogTitle className="font-display text-[2rem] leading-[1.05] font-medium text-ink">
                {gift.name}
              </DialogTitle>
              <DialogDescription className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
                {gift.description || 'A thoughtful gift for the couple.'}
              </DialogDescription>
              <p className="mt-2 font-extrabold text-berry">
                {count} of {MAX_RESERVATIONS_PER_GIFT} reservation spots are
                already taken.
              </p>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="guest-name" className={fieldLabel}>
                Your name
              </Label>
              <Input
                id="guest-name"
                name="guestName"
                required
                autoComplete="name"
                defaultValue={defaultName}
                placeholder="Priya Sharma"
                className={field}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guest-message" className={fieldLabel}>
                Message for the couple
              </Label>
              <Textarea
                id="guest-message"
                name="message"
                rows={3}
                placeholder="Optional note with your gift"
                className={cn(field, 'h-auto min-h-24 resize-y py-3')}
              />
            </div>

            <Turnstile
              action="reserve"
              resetKey={turnstile.resetKey}
              onToken={turnstile.setToken}
            />

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-sm font-semibold text-destructive"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button type="button" className={ghostButton} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={primaryButton}
                disabled={pending || isGiftFull(gift)}
              >
                {pending
                  ? 'Reserving...'
                  : isGiftFull(gift)
                    ? 'Fully Reserved'
                    : label}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
