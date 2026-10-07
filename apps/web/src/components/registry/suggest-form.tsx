import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Turnstile } from '#/components/turnstile'
import { cn } from '#/lib/utils'
import { field, fieldLabel, kicker, primaryButton } from './styles'
import { useTurnstileToken } from './use-turnstile-token'

export interface SuggestData {
  name: string
  category: string
  price: number
  link: string
  description: string
  website: string
  turnstileToken: string | undefined
}

export function SuggestForm({
  categories,
  pending,
  error,
  onSubmit,
}: {
  categories: Array<string>
  pending: boolean
  error: string
  /** Call `reset` once the gift is saved. */
  onSubmit: (data: SuggestData, reset: () => void) => void
}) {
  const turnstile = useTurnstileToken()

  return (
    <aside
      aria-labelledby="add-gift-heading"
      className="rounded-lg border border-gold/30 bg-surface/90 p-[18px] shadow-deep sm:p-6 lg:sticky lg:top-5"
    >
      <div className="mb-[18px]">
        <p className={cn(kicker, 'mb-2.5')}>Add an Idea</p>
        <h2
          id="add-gift-heading"
          className="font-display text-[2.15rem] leading-none font-medium text-ink"
        >
          Suggest a Gift
        </h2>
      </div>

      <form
        className="grid gap-[15px]"
        onSubmit={(event) => {
          event.preventDefault()
          const formElement = event.currentTarget
          const form = new FormData(formElement)
          onSubmit(
            {
              name: String(form.get('name') ?? ''),
              category: String(form.get('category') ?? ''),
              price: Number(form.get('price') || 0),
              link: String(form.get('link') ?? ''),
              description: String(form.get('description') ?? ''),
              website: String(form.get('website') ?? ''),
              turnstileToken: turnstile.consume(),
            },
            () => formElement.reset(),
          )
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="gift-name" className={fieldLabel}>
            Gift name
          </Label>
          <Input
            id="gift-name"
            name="name"
            required
            placeholder="Ceramic serving bowl"
            className={field}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gift-category" className={fieldLabel}>
            Category
          </Label>
          <Input
            id="gift-category"
            name="category"
            list="gift-category-options"
            placeholder="Kitchen, Travel, Decor..."
            className={field}
          />
          <datalist id="gift-category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gift-price" className={fieldLabel}>
            Price (INR)
          </Label>
          <Input
            id="gift-price"
            name="price"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="6500"
            className={field}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gift-link" className={fieldLabel}>
            Store or link
          </Label>
          <Input
            id="gift-link"
            name="link"
            placeholder="Store name or https://store.example/gift"
            className={field}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gift-description" className={fieldLabel}>
            Notes
          </Label>
          <Textarea
            id="gift-description"
            name="description"
            rows={4}
            placeholder="Why this would be lovely for the couple"
            className={cn(field, 'h-auto min-h-28 resize-y py-3')}
          />
        </div>

        {/* Honeypot: off-screen for humans, bots tend to fill it. Must stay empty. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] size-px overflow-hidden opacity-0"
        >
          <label>
            Website
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
            />
          </label>
        </div>

        <Turnstile
          action="suggest"
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

        <Button
          type="submit"
          className={cn(primaryButton, 'w-full sm:w-fit')}
          disabled={pending}
        >
          {pending ? 'Adding...' : 'Add Gift'}
        </Button>
      </form>
    </aside>
  )
}
