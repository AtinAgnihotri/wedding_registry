import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { AuthSheet } from '#/components/auth/auth-sheet'
import { useCompleteSocialLogin } from '#/components/auth/auth-flow'
import { GiftCard } from '#/components/registry/gift-card'
import { Intro } from '#/components/registry/intro'
import type { SyncState } from '#/components/registry/intro'
import { RegistryToolbar } from '#/components/registry/registry-toolbar'
import { ReserveDialog } from '#/components/registry/reserve-dialog'
import { kicker } from '#/components/registry/styles'
import { SuggestForm } from '#/components/registry/suggest-form'
import { SummaryTiles } from '#/components/registry/summary-tiles'
import type { StatusFilter } from '#/components/registry/summary-tiles'
import { DEFAULT_CATEGORIES, isGiftFull } from '#/lib/gifts'
import type { Gift } from '#/lib/gifts'
import { cn } from '#/lib/utils'
import {
  addGift,
  listGifts,
  releaseGift,
  reserveGift,
} from '#/server/gifts.functions'
import { getSession } from '#/server/session.functions'

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
  component: Registry,
})

function errorMessage(error: unknown) {
  if (!error) return ''
  return error instanceof Error ? error.message : String(error)
}

const SAVE_FAILED = 'Save failed. Your change was not kept; please try again.'

function matchesStatus(gift: Gift, status: StatusFilter) {
  if (status === 'available') return !isGiftFull(gift)
  if (status === 'reserved') return gift.reservations.length > 0
  return true
}

function Registry() {
  const queryClient = useQueryClient()
  const { data: gifts, isFetching } = useSuspenseQuery(giftsQuery)
  const { data: session } = useSuspenseQuery(sessionQuery)

  const [status, setStatus] = useState<StatusFilter>('available')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [reserveId, setReserveId] = useState<string>()
  const [reserveOpen, setReserveOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [lastSync, setLastSync] = useState<{
    state: SyncState
    message: string
  }>({ state: 'idle', message: 'Shared registry connected' })

  useCompleteSocialLogin(Boolean(session.user))

  const setGift = (gift: Gift | null) => {
    if (!gift) return
    queryClient.setQueryData<Array<Gift>>(['gifts'], (current = []) =>
      current.some((item) => item.id === gift.id)
        ? current.map((item) => (item.id === gift.id ? gift : item))
        : [gift, ...current],
    )
  }

  const onSaved = (result: { gift: Gift | null }) => {
    setGift(result.gift)
    setLastSync({ state: 'saved', message: 'Shared registry updated' })
  }
  const onError = () => setLastSync({ state: 'error', message: SAVE_FAILED })

  const reserve = useMutation({
    mutationFn: (data: Parameters<typeof reserveGift>[0]['data']) =>
      reserveGift({ data }),
    onSuccess: (result) => {
      onSaved(result)
      setReserveOpen(false)
    },
    onError,
  })
  const release = useMutation({
    mutationFn: (data: Parameters<typeof releaseGift>[0]['data']) =>
      releaseGift({ data }),
    onSuccess: onSaved,
    onError,
  })
  const add = useMutation({
    mutationFn: (data: Parameters<typeof addGift>[0]['data']) =>
      addGift({ data }),
    onSuccess: onSaved,
    onError,
  })

  const saving = reserve.isPending || release.isPending || add.isPending
  const sync = saving
    ? { state: 'saving' as const, message: 'Saving to shared registry...' }
    : isFetching
      ? {
          state: 'refreshing' as const,
          message: 'Refreshing shared registry...',
        }
      : lastSync

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['gifts'] })
    setLastSync(
      queryClient.getQueryState(['gifts'])?.status === 'error'
        ? {
            state: 'error',
            message:
              'Showing saved copy. Shared registry refresh is slow or unavailable.',
          }
        : { state: 'idle', message: 'Shared registry connected' },
    )
  }

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          'All',
          ...DEFAULT_CATEGORIES,
          ...gifts.map((gift) => gift.category).filter(Boolean),
        ]),
      ),
    [gifts],
  )
  const activeCategory = categories.includes(category) ? category : 'All'

  const counts = {
    available: gifts.filter((gift) => !isGiftFull(gift)).length,
    reserved: gifts.filter((gift) => gift.reservations.length > 0).length,
    all: gifts.length,
  }

  const query = search.trim().toLowerCase()
  const visibleGifts = gifts.filter(
    (gift) =>
      (activeCategory === 'All' || gift.category === activeCategory) &&
      matchesStatus(gift, status) &&
      `${gift.name} ${gift.category} ${gift.description}`
        .toLowerCase()
        .includes(query),
  )

  const reserveGiftTarget = gifts.find((gift) => gift.id === reserveId)

  const accountLabel = session.authEnabled
    ? session.user
      ? session.user.name || 'Account'
      : 'Sign in (optional)'
    : null

  return (
    <main className="mx-auto w-[min(1160px,calc(100%-22px))] pt-4 pb-14 sm:w-[min(1160px,calc(100%-32px))] sm:pt-9">
      <Intro
        sync={sync}
        isRefreshing={isFetching}
        onRefresh={() => void refresh()}
        accountLabel={accountLabel}
        onAccount={() => setAuthOpen(true)}
      />

      <SummaryTiles counts={counts} value={status} onChange={setStatus} />

      <RegistryToolbar
        search={search}
        onSearch={setSearch}
        categories={categories}
        category={activeCategory}
        onCategory={setCategory}
      />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="registry-heading" className="min-w-0">
          <div className="mb-[18px]">
            <p className={cn(kicker, 'mb-2.5')}>Registry</p>
            <h2
              id="registry-heading"
              className="font-display text-[2.25rem] leading-none font-medium text-ink sm:text-[3rem]"
            >
              Choose a Gift
            </h2>
          </div>

          {release.error ? (
            <p
              role="alert"
              className="mb-4 rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"
            >
              {errorMessage(release.error)}
            </p>
          ) : null}

          <div
            key={`${status}:${activeCategory}`}
            data-testid="gift-list"
            className="grid gap-4 sm:grid-cols-2"
          >
            {visibleGifts.map((gift, index) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                index={index}
                releasing={
                  release.isPending && release.variables.id === gift.id
                }
                onReserve={(target) => {
                  reserve.reset()
                  setReserveId(target.id)
                  setReserveOpen(true)
                }}
                onRelease={(target) => {
                  release.reset()
                  release.mutate({ id: target.id })
                }}
              />
            ))}
          </div>
          {visibleGifts.length === 0 ? (
            <p className="mt-7 rounded-lg border border-dashed border-line bg-surface/70 p-7 text-ink-muted">
              No gifts match that search yet.
            </p>
          ) : null}
        </section>

        <SuggestForm
          categories={categories.filter((name) => name !== 'All')}
          pending={add.isPending}
          error={errorMessage(add.error)}
          onSubmit={(data, reset) => {
            add.reset()
            add.mutate(data, {
              onSuccess: (result) => {
                reset()
                setCategory(result.gift?.category || 'All')
                setStatus('all')
                setSearch('')
              },
            })
          }}
        />
      </div>

      <ReserveDialog
        open={reserveOpen}
        gift={reserveGiftTarget}
        defaultName={session.user?.name ?? ''}
        pending={reserve.isPending}
        error={errorMessage(reserve.error)}
        onClose={() => setReserveOpen(false)}
        onSubmit={(data) => reserve.mutate(data)}
      />

      {session.authEnabled ? (
        <AuthSheet
          open={authOpen}
          onOpenChange={setAuthOpen}
          session={session}
        />
      ) : null}
    </main>
  )
}
