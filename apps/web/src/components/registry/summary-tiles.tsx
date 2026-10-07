import { cn } from '#/lib/utils'

export type StatusFilter = 'available' | 'reserved' | 'all'

const tiles: Array<{ value: StatusFilter; label: string }> = [
  { value: 'available', label: 'Available Gifts' },
  { value: 'reserved', label: 'Reserved Gifts' },
  { value: 'all', label: 'All Gift Ideas' },
]

export function SummaryTiles({
  counts,
  value,
  onChange,
}: {
  counts: Record<StatusFilter, number>
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}) {
  return (
    <section
      aria-label="Registry summary"
      className="my-[22px] grid grid-cols-3 gap-2.5 sm:gap-4"
    >
      {tiles.map((tile) => {
        const active = tile.value === value
        return (
          <button
            key={tile.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tile.value)}
            className={cn(
              'min-w-0 rounded-lg border border-line bg-surface/80 p-3.5 text-left shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-gold/65 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-gold/25 focus-visible:outline-none sm:p-[22px]',
              active &&
                '-translate-y-0.5 border-gold/65 bg-linear-145 from-surface/95 to-champagne/75 shadow-lift',
            )}
          >
            <span className="block font-display text-[1.6rem] leading-none text-emerald-dark sm:text-[2rem]">
              {counts[tile.value]}
            </span>
            <span className="mt-1.5 block text-[0.78rem] leading-snug font-semibold text-ink-muted sm:text-[0.92rem]">
              {tile.label}
            </span>
          </button>
        )
      })}
    </section>
  )
}
