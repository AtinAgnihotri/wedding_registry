import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Turnstile } from '#/components/turnstile'
import { formatINR, isGiftFull, MAX_RESERVATIONS_PER_GIFT } from '#/lib/gifts'
import type { Gift } from '#/lib/gifts'
import {
  addGift,
  listGifts,
  releaseGift,
  reserveGift,
} from '#/server/gifts.functions'
import { getSession } from '#/server/session.functions'

// Functional stub only. Visual design is owned by PRP-003 (Cursor).

const giftsQuery = queryOptions({
  queryKey: ['gifts'],
  queryFn: () => listGifts(),
  staleTime: 15_000,
})

const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSession(),
})

export const Route = createFileRoute('/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(giftsQuery),
      context.queryClient.ensureQueryData(sessionQuery),
    ]),
  component: RegistryStub,
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function RegistryStub() {
  const queryClient = useQueryClient()
  const { data: gifts } = useSuspenseQuery(giftsQuery)
  const { data: session } = useSuspenseQuery(sessionQuery)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string>()
  const [turnstileReset, setTurnstileReset] = useState(0)

  // Turnstile tokens are single-use: hand the current one to a mutation, then re-arm.
  const consumeTurnstileToken = () => {
    setTurnstileReset((n) => n + 1)
    return turnstileToken
  }

  const setGift = (gift: Gift | null) => {
    if (!gift) return
    queryClient.setQueryData<Array<Gift>>(['gifts'], (current = []) =>
      current.some((item) => item.id === gift.id)
        ? current.map((item) => (item.id === gift.id ? gift : item))
        : [gift, ...current],
    )
  }

  const onError = (err: unknown) => setError(errorMessage(err))

  const reserve = useMutation({
    mutationFn: (data: Parameters<typeof reserveGift>[0]['data']) =>
      reserveGift({ data }),
    onSuccess: (result) => setGift(result.gift),
    onError,
  })
  const release = useMutation({
    mutationFn: (data: Parameters<typeof releaseGift>[0]['data']) =>
      releaseGift({ data }),
    onSuccess: (result) => setGift(result.gift),
    onError,
  })
  const add = useMutation({
    mutationFn: (data: Parameters<typeof addGift>[0]['data']) =>
      addGift({ data }),
    onSuccess: (result) => setGift(result.gift),
    onError,
  })

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Wedding registry (backend stub)</h1>
      <Button
        variant="outline"
        onClick={() => queryClient.invalidateQueries({ queryKey: ['gifts'] })}
      >
        Refresh
      </Button>
      <p className="text-sm" data-testid="session">
        {session.user ? (
          <>Signed in as {session.user.name}. </>
        ) : (
          <>Browsing as guest. </>
        )}
        {session.authEnabled ? (
          <Link to="/auth" className="underline">
            {session.user ? 'Account' : 'Log in (optional)'}
          </Link>
        ) : null}
      </p>
      <Turnstile
        action="registry"
        resetKey={turnstileReset}
        onToken={setTurnstileToken}
      />
      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4" data-testid="gift-list">
        {gifts.map((gift) => (
          <li
            key={gift.id}
            className="rounded border p-3"
            data-gift-id={gift.id}
          >
            <div className="font-semibold">
              {gift.name} — {formatINR(gift.price)} ({gift.category})
            </div>
            <div className="text-sm">{gift.description}</div>
            {gift.link ? (
              <a
                className="text-sm underline"
                href={gift.link}
                target="_blank"
                rel="noreferrer"
              >
                {gift.link}
              </a>
            ) : null}
            <div className="text-sm">
              {gift.reservations.length}/{MAX_RESERVATIONS_PER_GIFT} reserved
              {gift.reservedBy ? `: ${gift.reservedBy}` : ''}
            </div>
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setError('')
                const form = new FormData(event.currentTarget)
                reserve.mutate({
                  id: gift.id,
                  guestName: String(form.get('guestName') ?? ''),
                  message: String(form.get('message') ?? ''),
                  turnstileToken: consumeTurnstileToken(),
                })
              }}
            >
              <Input
                name="guestName"
                placeholder="Your name"
                className="w-40"
                defaultValue={session.user?.name ?? ''}
                required
              />
              <Input
                name="message"
                placeholder="Message (optional)"
                className="w-56"
              />
              <Button
                type="submit"
                disabled={isGiftFull(gift) || reserve.isPending}
              >
                {gift.reservations.length ? 'Join gift' : 'Reserve'}
              </Button>
              {gift.canRelease ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={release.isPending}
                  onClick={() => {
                    setError('')
                    release.mutate({ id: gift.id })
                  }}
                >
                  Release mine
                </Button>
              ) : null}
            </form>
          </li>
        ))}
      </ul>

      <form
        className="space-y-2 rounded border p-3"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          const formElement = event.currentTarget
          const form = new FormData(formElement)
          add.mutate(
            {
              name: String(form.get('name') ?? ''),
              category: String(form.get('category') ?? ''),
              price: Number(form.get('price') || 0),
              link: String(form.get('link') ?? ''),
              description: String(form.get('description') ?? ''),
              website: String(form.get('website') ?? ''),
              turnstileToken: consumeTurnstileToken(),
            },
            { onSuccess: () => formElement.reset() },
          )
        }}
      >
        <h2 className="font-semibold">Suggest a gift</h2>
        <Input name="name" placeholder="Gift name" required />
        <Input name="category" placeholder="Category (Home, Kitchen, ...)" />
        <Input name="price" type="number" min={0} placeholder="Price (INR)" />
        <Input name="link" placeholder="Store link" />
        <Textarea name="description" placeholder="Description" />
        {/* Honeypot: hidden from humans, bots tend to fill it. */}
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <Button type="submit" disabled={add.isPending}>
          Add gift
        </Button>
      </form>
    </main>
  )
}
