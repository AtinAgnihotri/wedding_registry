import { ExternalLink } from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  formatINR,
  isGiftFull,
  MAX_RESERVATIONS_PER_GIFT,
  normalizeUrl,
} from '#/lib/gifts'
import type { Gift } from '#/lib/gifts'
import { cn } from '#/lib/utils'
import { primaryButton, secondaryButton } from './styles'

function formatNames(names: Array<string>) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function GiftCard({
  gift,
  index,
  onReserve,
  onRelease,
  releasing,
}: {
  gift: Gift
  index: number
  onReserve: (gift: Gift) => void
  onRelease: (gift: Gift) => void
  releasing: boolean
}) {
  const count = gift.reservations.length
  const full = isGiftFull(gift)
  const link = normalizeUrl(gift.link)
  const names = gift.reservations.map((r) =>
    r.mine ? `${r.name} (you)` : r.name,
  )

  return (
    <article
      data-gift-id={gift.id}
      style={{ '--i': index } as React.CSSProperties}
      className={cn(
        'wr-gift-enter flex min-h-[260px] flex-col gap-4 rounded-lg border border-line bg-surface p-[18px] shadow-[0_10px_34px_rgba(36,48,47,0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lift sm:p-[22px]',
        count > 0 && 'bg-linear-145 from-champagne/55 to-surface/95',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.75rem] font-extrabold tracking-[0.1em] text-berry uppercase">
          {gift.category}
        </span>
        <span className="font-extrabold text-emerald-dark tabular-nums">
          {formatINR(gift.price)}
        </span>
      </div>

      <div className="grid gap-2">
        <h3 className="font-display text-[1.6rem] leading-[1.08] font-medium text-ink">
          {gift.name}
        </h3>
        <p className="leading-[1.55] text-ink-muted">
          {gift.description || 'A thoughtful gift for the couple.'}
        </p>
      </div>

      <div className="grid gap-2.5">
        <p className="w-fit rounded-full border border-gold/30 bg-champagne/40 px-2.5 py-1.5 text-[0.8rem] font-extrabold text-berry">
          {count} of {MAX_RESERVATIONS_PER_GIFT} spots reserved
        </p>
        {count > 0 ? (
          <>
            <p className="font-bold text-emerald-dark">
              Reserved by {formatNames(names)}
            </p>
            <div
              role="img"
              aria-label={`${count} of ${MAX_RESERVATIONS_PER_GIFT} reservation spots filled`}
              className="grid grid-cols-5 gap-1.5"
            >
              {Array.from({ length: MAX_RESERVATIONS_PER_GIFT }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-2 rounded-full bg-[#eadfd4]',
                    i < count && 'bg-linear-90 from-gold to-berry',
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {gift.canRelease ? (
          <Button
            type="button"
            className={secondaryButton}
            disabled={releasing}
            onClick={() => onRelease(gift)}
          >
            {releasing ? 'Releasing...' : 'Release My Spot'}
          </Button>
        ) : full ? (
          <Button type="button" className={secondaryButton} disabled>
            Fully Reserved
          </Button>
        ) : (
          <Button
            type="button"
            className={primaryButton}
            onClick={() => onReserve(gift)}
          >
            {count > 0 ? 'Join Gift' : 'Reserve Gift'}
          </Button>
        )}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 font-extrabold text-berry underline-offset-4 hover:underline"
          >
            View gift
            <ExternalLink className="size-3.5" />
          </a>
        ) : gift.link ? (
          <span className="truncate font-extrabold text-emerald-dark">
            {gift.link}
          </span>
        ) : null}
      </div>
    </article>
  )
}
