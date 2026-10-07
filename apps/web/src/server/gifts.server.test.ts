import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-start/server-only', () => ({}))

import {
  addGiftRecord,
  invalidateGiftCache,
  listGiftsForCaller,
  releaseGiftRecord,
  reserveGiftRecord,
} from './gifts.server'
import {
  createMemorySheetStore,
  GIFT_HEADERS,
  setGiftSheetStoreForTesting,
} from './sheets.server'
import type { WritableHeaderStore } from './sheets.server'

const guestA = { guestToken: 'a'.repeat(43) }
const guestB = { guestToken: 'b'.repeat(43) }
let store: WritableHeaderStore

beforeEach(() => {
  store = createMemorySheetStore()
  setGiftSheetStoreForTesting(store)
  invalidateGiftCache()
})

describe('gift registry', () => {
  it('seeds an empty sheet with legacy headers and default gifts', async () => {
    const gifts = await listGiftsForCaller({})
    const snapshot = await store.read()
    expect(snapshot.headers).toEqual([...GIFT_HEADERS])
    expect(gifts).toHaveLength(9)
    expect(gifts[0]).toMatchObject({ id: 'hand-thrown-dinnerware-set', price: 19999 })
  })

  it('caps reservations at five and blocks duplicate names', async () => {
    await listGiftsForCaller({})
    for (let index = 0; index < 5; index += 1) {
      await reserveGiftRecord(
        { id: 'dishwasher', guestName: `Guest ${index}` },
        { guestToken: String(index).repeat(43) },
      )
    }
    await expect(
      reserveGiftRecord({ id: 'dishwasher', guestName: 'Sixth' }, guestA),
    ).rejects.toThrow('five contributors')
    await expect(
      reserveGiftRecord({ id: 'stand-mixer', guestName: 'Asha' }, guestA).then(() =>
        reserveGiftRecord({ id: 'stand-mixer', guestName: 'asha' }, guestB),
      ),
    ).rejects.toThrow('already joined')
  })

  it('stores hashed release codes and only lets the owner release', async () => {
    await listGiftsForCaller({})
    const gift = await reserveGiftRecord(
      { id: 'walking-pad', guestName: 'Asha', message: 'Yay' },
      guestA,
    )
    expect(gift.canRelease).toBe(true)
    expect(gift.reservations[0]).toMatchObject({ name: 'Asha', mine: true })
    expect(JSON.stringify(gift)).not.toContain('releaseCode')

    const row = (await store.read()).rows.find((r) => r.record.id === 'walking-pad')!
    expect(String(row.record.releaseCode)).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(String(row.record.reservations)).not.toContain(guestA.guestToken)

    const asSeenByB = (await listGiftsForCaller(guestB)).find((g) => g.id === 'walking-pad')!
    expect(asSeenByB.canRelease).toBe(false)
    await expect(releaseGiftRecord('walking-pad', guestB)).rejects.toThrow(
      'only be released',
    )

    const released = await releaseGiftRecord('walking-pad', guestA)
    expect(released.reservations).toHaveLength(0)
  })

  it('lets a signed-in user release without the cookie, and admin clear all', async () => {
    await listGiftsForCaller({})
    await reserveGiftRecord(
      { id: 'coffee-machine', guestName: 'Ravi' },
      { ...guestA, userId: 'usr_1' },
    )
    await reserveGiftRecord({ id: 'coffee-machine', guestName: 'Meera' }, guestB)
    const row = (await store.read()).rows.find((r) => r.record.id === 'coffee-machine')!
    expect(String(row.record.reservations)).toContain('"userId":"usr_1"')

    const afterUser = await releaseGiftRecord('coffee-machine', { userId: 'usr_1' })
    expect(afterUser.reservations.map((r) => r.name)).toEqual(['Meera'])

    const afterAdmin = await releaseGiftRecord('coffee-machine', { isAdmin: true })
    expect(afterAdmin.reservations).toHaveLength(0)
  })

  it('adds gifts and invalidates the list cache', async () => {
    await listGiftsForCaller({})
    const gift = await addGiftRecord(
      { name: 'Board games', category: 'Fun', price: 2500, link: 'example.com/games' },
      {},
    )
    expect(gift.link).toBe('https://example.com/games')
    const gifts = await listGiftsForCaller({})
    expect(gifts.some((g) => g.name === 'Board games')).toBe(true)
  })

  it('retries once when the row changes between read and write', async () => {
    await listGiftsForCaller({})
    const originalReadRow = store.readRow.bind(store)
    let calls = 0
    store.readRow = async (rowNumber, headers) => {
      calls += 1
      const record = await originalReadRow(rowNumber, headers)
      return calls === 1 ? { ...record, updatedAt: 'changed-by-someone-else' } : record
    }
    const gift = await reserveGiftRecord({ id: 'brass-floor-lamp', guestName: 'Asha' }, guestA)
    expect(calls).toBe(2)
    expect(gift.reservations).toHaveLength(1)
  })
})
