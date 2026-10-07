import { MapPin, RefreshCw, UserRound } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export type SyncState = 'idle' | 'refreshing' | 'saving' | 'saved' | 'error'

export const MAPS_URL = 'https://maps.app.goo.gl/mh2DYUnVHghojit97'

const syncDot: Record<SyncState, string> = {
  idle: 'bg-champagne',
  refreshing: 'bg-champagne/60',
  saving: 'bg-champagne/60',
  saved: 'bg-[#bfe3b9]',
  error: 'bg-[#ffb3a6]',
}

export function Intro({
  sync,
  isRefreshing,
  onRefresh,
  accountLabel,
  onAccount,
}: {
  sync: { state: SyncState; message: string }
  isRefreshing: boolean
  onRefresh: () => void
  /** Hidden when login is not configured. */
  accountLabel: string | null
  onAccount: () => void
}) {
  return (
    <section
      aria-labelledby="page-title"
      className="wr-hero relative isolate grid gap-6 overflow-hidden rounded-lg border border-gold/35 p-[22px] shadow-deep sm:gap-7 sm:p-[34px] md:min-h-[520px] md:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="wr-hero-text relative z-10 max-w-[720px] self-end md:py-[34px]">
        <p className="mb-3 text-[0.76rem] font-extrabold tracking-[0.14em] text-champagne uppercase">
          Wedding Gift Registry
        </p>
        <h1
          id="page-title"
          aria-label="Mitthu and Atin"
          className="font-display text-[clamp(3.2rem,14vw,4.2rem)] leading-[0.88] font-medium tracking-[-0.01em] text-surface sm:text-[clamp(4.3rem,6.4vw,6.3rem)]"
        >
          <span className="block">Mitthu</span>
          <span
            aria-hidden="true"
            className="my-[0.04em] ml-[0.06em] block text-[0.5em] leading-none text-champagne italic"
          >
            &amp;
          </span>
          <span className="block">Atin</span>
        </h1>
        <p className="mt-4 max-w-[46ch] text-base leading-[1.6] text-pretty text-surface/90 sm:mt-6 sm:text-[1.06rem] sm:leading-[1.68]">
          Help us begin married life with things we will use, love, and
          remember. Reserve a gift in your name, or suggest something
          thoughtful.
        </p>
      </div>

      <aside
        aria-label="Wedding details"
        className="relative z-10 flex flex-col justify-end gap-3.5 rounded-lg border border-champagne/25 bg-linear-155 from-emerald-dark/90 to-berry/80 p-5 text-surface backdrop-blur-md sm:p-6"
      >
        <img
          src="/hero-couple.jpg"
          alt="Mitthu and Atin in a garden"
          width={614}
          height={819}
          className="h-[180px] w-full rounded-md object-cover object-[center_60%] shadow-[0_16px_34px_rgba(0,0,0,0.22)] sm:h-[300px] md:h-[260px]"
        />
        <p className="font-display text-[1.7rem] leading-none whitespace-nowrap sm:text-[2rem]">
          <time dateTime="2026-12-12">12 December 2026</time>
        </p>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="group grid w-fit max-w-full gap-1 rounded-lg border border-champagne/30 bg-surface/10 px-3.5 py-3 text-surface/90 transition hover:-translate-y-px hover:border-champagne/60 hover:bg-surface/15"
        >
          <span className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 shrink-0 text-champagne" />
            Sunahari Bagh Farm, Gurgaon
          </span>
          <span className="text-[0.74rem] font-extrabold tracking-[0.08em] text-champagne uppercase group-hover:underline">
            View on Google Maps
          </span>
        </a>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-11 rounded-full border border-champagne/40 bg-surface/90 px-4 text-sm font-extrabold text-emerald-dark hover:bg-surface"
          >
            <RefreshCw />
            {isRefreshing ? 'Refreshing...' : 'Refresh Registry'}
          </Button>
          {accountLabel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onAccount}
              className="h-11 max-w-full rounded-full px-4 text-sm font-bold text-champagne hover:bg-surface/10 hover:text-surface"
            >
              <UserRound />
              <span className="truncate">{accountLabel}</span>
            </Button>
          ) : null}
        </div>
        <p
          aria-live="polite"
          data-state={sync.state}
          className="flex items-center gap-2 text-[0.82rem] font-bold text-surface/75 data-[state=error]:text-[#ffd7cf] data-[state=saved]:text-[#dff2dc]"
        >
          <span
            aria-hidden="true"
            className={cn('size-2 shrink-0 rounded-full', syncDot[sync.state])}
          />
          {sync.message}
        </p>
      </aside>
    </section>
  )
}
