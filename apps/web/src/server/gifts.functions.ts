import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getRegistryCaller } from './caller.server'
import {
  addGiftRecord,
  listGiftsForCaller,
  releaseGiftRecord,
  reserveGiftRecord,
} from './gifts.server'

const addGiftSchema = z.object({
  name: z.string().trim().min(1, 'Gift name is required.').max(120),
  category: z.string().trim().max(60).optional(),
  price: z.coerce.number().min(0).max(10_000_000).optional(),
  description: z.string().max(1000).optional(),
  link: z.string().max(2000).optional(),
  turnstileToken: z.string().max(4096).optional(),
  website: z.string().max(200).optional(),
})

const reserveGiftSchema = z.object({
  id: z.string().trim().min(1).max(120),
  guestName: z.string().trim().min(1, 'Guest name is required.').max(80),
  message: z.string().max(500).optional(),
  turnstileToken: z.string().max(4096).optional(),
})

const releaseGiftSchema = z.object({
  id: z.string().trim().min(1).max(120),
  adminKey: z.string().max(500).optional(),
})

/** Public list. Cached server-side for ~60s; `mine`/`canRelease` are per-caller. */
export const listGifts = createServerFn({ method: 'GET' }).handler(async () => {
  const caller = await getRegistryCaller()
  return listGiftsForCaller(caller)
})

/** "Suggest a gift". */
export const addGift = createServerFn({ method: 'POST' })
  .validator(addGiftSchema)
  .handler(async ({ data }) => {
    if (data.website) {
      // Honeypot tripped: pretend success without writing.
      return { ok: true as const, gift: null }
    }
    const caller = await getRegistryCaller()
    const gift = await addGiftRecord(data, caller)
    return { ok: true as const, gift }
  })

/** Join a gift (max 5 per gift). Sets an HttpOnly guest cookie used for release. */
export const reserveGift = createServerFn({ method: 'POST' })
  .validator(reserveGiftSchema)
  .handler(async ({ data }) => {
    const caller = await getRegistryCaller({ createGuestToken: true })
    const gift = await reserveGiftRecord(data, caller)
    return { ok: true as const, gift }
  })

/** Release the caller's own reservation (cookie / signed-in user), or all reservations with `adminKey`. */
export const releaseGift = createServerFn({ method: 'POST' })
  .validator(releaseGiftSchema)
  .handler(async ({ data }) => {
    const caller = await getRegistryCaller({ adminKey: data.adminKey })
    const gift = await releaseGiftRecord(data.id, caller)
    return { ok: true as const, gift }
  })
