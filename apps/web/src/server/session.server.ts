import { getRequest } from '@tanstack/react-start/server'

import { getAuth } from './auth.server'

export interface SessionUser {
  id: string
  name: string
  email: string | null
  phoneNumber: string | null
}

/** Current Better Auth user, or null for guests / when auth is not configured. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const auth = getAuth()
  if (!auth) return null
  const session = await auth.api.getSession({ headers: getRequest().headers })
  if (!session) return null
  const user = session.user as typeof session.user & {
    phoneNumber?: string | null
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email.endsWith('@phone.invalid') ? null : user.email,
    phoneNumber: user.phoneNumber ?? null,
  }
}
