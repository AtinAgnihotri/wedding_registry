import { createServerFn } from '@tanstack/react-start'

import { getRegistryCaller } from './caller.server'
import { claimGuestReservations } from './gifts.server'
import { enabledSocialProviders, getAuth } from './auth.server'
import { getSessionUser } from './session.server'

/**
 * Session + login capabilities for the UI. `user` is null for guests.
 * Cursor: use `user.name` to prefill the reserve form's guest name.
 */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    return {
      user,
      authEnabled: getAuth() !== null,
      socialProviders: getAuth() ? enabledSocialProviders() : [],
    }
  },
)

/** After login, attach this browser's anonymous reservations to the signed-in user. */
export const claimMyReservations = createServerFn({ method: 'POST' }).handler(
  async () => {
    const caller = await getRegistryCaller()
    return claimGuestReservations(caller)
  },
)
