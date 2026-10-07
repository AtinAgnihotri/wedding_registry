import '@tanstack/react-start/server-only'
import { createHash, randomUUID } from 'node:crypto'

import { GIFT_HEADERS, getGiftSheetStore } from './sheets.server'
import type { SheetRecord, SheetRow, SheetSnapshot } from './sheets.server'
import { MAX_RESERVATIONS_PER_GIFT, normalizeUrl } from '#/lib/gifts'
import type { AddGiftInput, Gift, ReserveGiftInput } from '#/lib/gifts'

const SCRIPT_TIMEZONE = 'Asia/Kolkata'
const LIST_CACHE_TTL_MS = 60_000
const HASH_PREFIX = 'sha256:'

const DEFAULT_GIFTS: Array<{
  id: string
  name: string
  category: string
  price: number
  description: string
  link: string
}> = [
  {
    id: 'hand-thrown-dinnerware-set',
    name: 'Hand-thrown dinnerware set',
    category: 'Kitchen',
    price: 19999,
    description:
      'A twenty one-piece luxe ceramic dinner set for slow Sunday lunches and festival dinners.',
    link: 'https://www.fabindia.com/ceramic-decaled-luxe-dinner-set-20184880',
  },
  {
    id: 'linen-bedding-bundle',
    name: 'Linen bedding bundle',
    category: 'Home',
    price: 6999,
    description:
      "Soft sheets and pillow covers for the couple's first home together.",
    link: 'https://www.homecentre.in/in/en/Homeware/Furnishing/Bedding/HOMECENTRE-Chime-Doeskin-Cotton-4Pcs-Printed-Double-Bed-In-A-Bag-Set/p/1000014093014',
  },
  {
    id: 'weekend-spa-retreat',
    name: 'Weekend spa retreat',
    category: 'Experiences',
    price: 28332,
    description:
      'A quiet post-wedding reset with massages, breakfast, and late checkout.',
    link: 'https://www.roseatehotels.com/newdelhi/theroseate/aheli-spa/',
  },
  {
    id: 'brass-floor-lamp',
    name: 'Brass floor lamp',
    category: 'Decor',
    price: 9800,
    description:
      'Warm evening light for reading, hosting, and settling into the new place.',
    link: 'https://www.homecentre.in/in/en/Decor/Lighting/Floor-Lamps/HOMECENTRE-Melody-Div-Metal-Floor-Lamp/p/1000015317595',
  },
  {
    id: 'stand-mixer',
    name: 'Stand mixer',
    category: 'Kitchen',
    price: 6999,
    description:
      'So that they can make you birthday cakes, late-night cookies, and ambitious weekend baking.',
    link: 'https://www.amazon.in/Durability-Accessories-Dishwasher-Kneading-Kratos-Plus/dp/B0CX4T932R/',
  },
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    category: 'Home',
    price: 42990,
    description: 'So that the couple saves time.',
    link: 'https://www.amazon.in/Setting-Dishwasher-Intensive-Program-Pre-Rinse/dp/B07JW77MVJ/',
  },
  {
    id: 'coffee-machine',
    name: 'Coffee Machine',
    category: 'Kitchen',
    price: 19999,
    description: 'A coffee maker for the coffee lovers.',
    link: 'https://www.amazon.in/DeLonghi-Dedica-Compact-Espresso-machine/dp/B0F3S1JJ4T',
  },
  {
    id: 'coffee-mug-set',
    name: 'Coffee Mug set',
    category: 'Kitchen',
    price: 19999,
    description: 'A handsome set for morning coffee and slow evening chai.',
    link: 'https://www.homecentre.in/in/en/Tableware/Crockery/Tea-and-Coffee-Sets/HOMECENTRE-Caraway-Somber-Set-of-6-Stoneware-Cups-and-Saucers-with-Metal-Stand--220ml/p/1000015640049',
  },
  {
    id: 'walking-pad',
    name: 'Walking pad',
    category: 'Home',
    price: 29999,
    description: 'So that the couple can stay fit.',
    link: 'https://www.amazon.in/Flexnest-Flexpad-Foldable-Treadmill-Bluetooth/dp/B0F6VB8Y26/',
  },
]

/** Error whose message is safe to show to guests. */
export class RegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegistryError'
  }
}

class ConflictError extends Error {}

/** Who is calling: anonymous browser token, signed-in user, and/or admin. */
export interface RegistryCaller {
  guestToken?: string
  userId?: string
  isAdmin?: boolean
}

interface StoredReservation {
  name: string
  message: string
  /** `sha256:<hex>` of `${giftId}:${guestToken}`; never the raw token. */
  releaseCode: string
  createdAt: string
  userId?: string
}

export function hashReleaseCode(giftId: string, guestToken: string) {
  return (
    HASH_PREFIX +
    createHash('sha256').update(`${giftId}:${guestToken}`).digest('hex')
  )
}

function nowStamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCRIPT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

function text(value: unknown, maxLength = 500) {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength)
}

function parseReservations(record: SheetRecord): Array<StoredReservation> {
  const raw = record.reservations
  let items: unknown = []

  if (typeof raw === 'string' && raw.trim()) {
    try {
      items = JSON.parse(raw)
    } catch {
      items = []
    }
  }

  const reservations = (Array.isArray(items) ? items : [])
    .map((item: Record<string, unknown> | null) => {
      const reservation: StoredReservation = {
        name: text(item?.name ?? item?.reservedBy),
        message: text(item?.message),
        releaseCode: text(item?.releaseCode),
        createdAt: text(item?.createdAt),
      }
      const userId = text(item?.userId)
      if (userId) {
        reservation.userId = userId
      }
      return reservation
    })
    .filter((reservation) => reservation.name)
    .slice(0, MAX_RESERVATIONS_PER_GIFT)

  if (reservations.length) {
    return reservations
  }

  // Legacy single-reservation rows (pre-`reservations` column).
  const reservedBy = text(record.reservedBy)
  return reservedBy
    ? [
        {
          name: reservedBy,
          message: text(record.message),
          releaseCode: text(record.releaseCode),
          createdAt: text(record.updatedAt),
        },
      ]
    : []
}

function ownsReservation(
  giftId: string,
  reservation: StoredReservation,
  caller: RegistryCaller,
) {
  if (caller.userId && reservation.userId === caller.userId) {
    return true
  }

  return Boolean(
    caller.guestToken &&
      reservation.releaseCode.startsWith(HASH_PREFIX) &&
      reservation.releaseCode === hashReleaseCode(giftId, caller.guestToken),
  )
}

function toPublicGift(record: SheetRecord, caller: RegistryCaller): Gift {
  const id = text(record.id)
  const reservations = parseReservations(record).map((reservation) => ({
    name: reservation.name,
    message: reservation.message,
    createdAt: reservation.createdAt,
    mine: ownsReservation(id, reservation, caller),
  }))

  return {
    id,
    name: text(record.name),
    category: text(record.category) || 'Home',
    price: Number(record.price) || 0,
    description: text(record.description, 2000),
    link: normalizeUrl(text(record.link, 2000)),
    reservedBy: reservations.map((reservation) => reservation.name).join(', '),
    message: reservations
      .map((reservation) => reservation.message)
      .filter(Boolean)
      .join(' | '),
    reservations,
    createdAt: text(record.createdAt),
    updatedAt: text(record.updatedAt),
    canRelease:
      Boolean(caller.isAdmin && reservations.length) ||
      reservations.some((reservation) => reservation.mine),
  }
}

function withReservations(
  record: SheetRecord,
  reservations: Array<StoredReservation>,
): SheetRecord {
  const normalized = reservations.slice(0, MAX_RESERVATIONS_PER_GIFT)
  return {
    ...record,
    reservations: JSON.stringify(normalized),
    reservedBy: normalized.map((reservation) => reservation.name).join(', '),
    message: normalized
      .map((reservation) => reservation.message)
      .filter(Boolean)
      .join(' | '),
    releaseCode: normalized.at(-1)?.releaseCode ?? '',
    updatedAt: nowStamp(),
  }
}

function newGiftRecord(input: {
  id?: string
  name: string
  category?: string
  price?: number
  description?: string
  link?: string
}): SheetRecord {
  const now = nowStamp()
  return {
    id: text(input.id, 120) || randomUUID(),
    name: text(input.name, 120),
    category: text(input.category, 60) || 'Home',
    price: Math.max(0, Math.round(Number(input.price) || 0)),
    description: text(input.description, 1000),
    link: normalizeUrl(text(input.link, 2000)),
    reservedBy: '',
    message: '',
    releaseCode: '',
    reservations: '[]',
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Snapshot cache + write serialization
// ---------------------------------------------------------------------------

let cache: { snapshot: SheetSnapshot; expiresAt: number } | null = null
let writeQueue: Promise<unknown> = Promise.resolve()

export function invalidateGiftCache() {
  cache = null
}

function serializeWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.catch(() => undefined)
  return run
}

async function readSnapshot({ fresh }: { fresh: boolean }) {
  if (!fresh && cache && cache.expiresAt > Date.now()) {
    return cache.snapshot
  }

  const store = getGiftSheetStore()
  let snapshot = await store.read()

  if (!snapshot.headers.length) {
    await store.writeHeaders([...GIFT_HEADERS])
    await store.append(
      DEFAULT_GIFTS.map((gift) => newGiftRecord(gift)),
      [...GIFT_HEADERS],
    )
    snapshot = await store.read()
  } else {
    const missing = GIFT_HEADERS.filter(
      (header) => !snapshot.headers.includes(header),
    )
    if (missing.length) {
      await store.writeHeaders([...snapshot.headers, ...missing])
      snapshot = await store.read()
    }
  }

  cache = { snapshot, expiresAt: Date.now() + LIST_CACHE_TTL_MS }
  return snapshot
}

function findRow(snapshot: SheetSnapshot, id: string): SheetRow {
  const row = snapshot.rows.find((candidate) => text(candidate.record.id) === id)

  if (!row) {
    throw new RegistryError('Gift not found.')
  }

  return row
}

/**
 * Read-modify-write on a single gift row. Re-reads the row right before writing
 * and retries once if another writer changed it in between.
 */
async function mutateGiftRow(
  id: string,
  mutate: (record: SheetRecord) => SheetRecord,
): Promise<SheetRecord> {
  return serializeWrite(async () => {
    const store = getGiftSheetStore()

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const snapshot = await readSnapshot({ fresh: true })
      const row = findRow(snapshot, id)
      const next = mutate(row.record)
      const current = await store.readRow(row.rowNumber, snapshot.headers)

      if (
        text(current.id) !== id ||
        String(current.reservations ?? '') !==
          String(row.record.reservations ?? '') ||
        String(current.updatedAt ?? '') !== String(row.record.updatedAt ?? '')
      ) {
        invalidateGiftCache()
        if (attempt === 0) {
          continue
        }
        throw new ConflictError()
      }

      await store.update(row.rowNumber, next, snapshot.headers)
      invalidateGiftCache()
      return next
    }

    throw new ConflictError()
  }).catch((error: unknown) => {
    if (error instanceof ConflictError) {
      throw new RegistryError(
        'Someone else just updated this gift. Please refresh and try again.',
      )
    }
    throw error
  })
}

// ---------------------------------------------------------------------------
// Public operations (called from gifts.functions.ts)
// ---------------------------------------------------------------------------

export async function listGiftsForCaller(caller: RegistryCaller) {
  const snapshot = await readSnapshot({ fresh: false })
  return snapshot.rows
    .filter((row) => text(row.record.id) && text(row.record.name))
    .map((row) => toPublicGift(row.record, caller))
}

export async function addGiftRecord(input: AddGiftInput, caller: RegistryCaller) {
  const record = newGiftRecord(input)

  if (!text(record.name)) {
    throw new RegistryError('Gift name is required.')
  }

  return serializeWrite(async () => {
    const store = getGiftSheetStore()
    const snapshot = await readSnapshot({ fresh: true })

    if (snapshot.rows.some((row) => text(row.record.id) === record.id)) {
      record.id = randomUUID()
    }

    await store.append([record], snapshot.headers)
    invalidateGiftCache()
    return toPublicGift(record, caller)
  })
}

export async function reserveGiftRecord(
  input: ReserveGiftInput,
  caller: RegistryCaller,
) {
  const id = text(input.id, 120)
  const guestName = text(input.guestName, 80)
  const message = text(input.message, 500)

  if (!guestName) {
    throw new RegistryError('Guest name is required.')
  }

  if (!caller.guestToken && !caller.userId) {
    throw new RegistryError('Missing reservation identity.')
  }

  const record = await mutateGiftRow(id, (current) => {
    const reservations = parseReservations(current)

    if (reservations.length >= MAX_RESERVATIONS_PER_GIFT) {
      throw new RegistryError('This gift already has five contributors.')
    }

    if (
      reservations.some(
        (reservation) =>
          reservation.name.toLowerCase() === guestName.toLowerCase(),
      )
    ) {
      throw new RegistryError('This name has already joined this gift.')
    }

    if (reservations.some((reservation) => ownsReservation(id, reservation, caller))) {
      throw new RegistryError('You have already joined this gift.')
    }

    const reservation: StoredReservation = {
      name: guestName,
      message,
      releaseCode: caller.guestToken
        ? hashReleaseCode(id, caller.guestToken)
        : '',
      createdAt: nowStamp(),
    }

    if (caller.userId) {
      reservation.userId = caller.userId
    }

    return withReservations(current, [...reservations, reservation])
  })

  return toPublicGift(record, caller)
}

export async function releaseGiftRecord(id: string, caller: RegistryCaller) {
  const giftId = text(id, 120)

  const record = await mutateGiftRow(giftId, (current) => {
    const reservations = parseReservations(current)

    if (caller.isAdmin) {
      return withReservations(current, [])
    }

    const remaining = reservations.filter(
      (reservation) => !ownsReservation(giftId, reservation, caller),
    )

    if (remaining.length === reservations.length) {
      throw new RegistryError(
        'This reservation can only be released by the guest who made it.',
      )
    }

    return withReservations(current, remaining)
  })

  return toPublicGift(record, caller)
}

/** Attach `userId` to anonymous reservations made from this browser. */
export async function claimGuestReservations(caller: RegistryCaller) {
  if (!caller.userId || !caller.guestToken) {
    return { claimed: 0 }
  }

  const snapshot = await readSnapshot({ fresh: true })
  let claimed = 0

  for (const row of snapshot.rows) {
    const giftId = text(row.record.id)
    const needsClaim = parseReservations(row.record).some(
      (reservation) =>
        !reservation.userId &&
        reservation.releaseCode === hashReleaseCode(giftId, caller.guestToken!),
    )

    if (!needsClaim) {
      continue
    }

    await mutateGiftRow(giftId, (current) =>
      withReservations(
        current,
        parseReservations(current).map((reservation) => {
          if (
            !reservation.userId &&
            reservation.releaseCode ===
              hashReleaseCode(giftId, caller.guestToken!)
          ) {
            claimed += 1
            return { ...reservation, userId: caller.userId }
          }
          return reservation
        }),
      ),
    )
  }

  return { claimed }
}
