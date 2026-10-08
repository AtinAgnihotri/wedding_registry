import { getRequest } from '@tanstack/react-start/server'

import { getAuth } from './auth.server'

export interface SessionUser {
  id: string
  name: string
  email: string | null
  phoneNumber: string | null
}

/**
 * Phone sign-ups get their number as a placeholder name (`getTempName`). Never surface it
 * as a display name: the UI prefills the public "Reserved by" name from it.
 */
export function publicUserName(name: string, phoneNumber: string | null) {
  const trimmed = name.trim()
  if (!trimmed) return ''
  if (phoneNumber && trimmed.replace(/[\s-]/g, '') === phoneNumber) return ''
  return /^\+?\d[\d\s-]{6,}$/.test(trimmed) ? '' : trimmed
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
    name: publicUserName(user.name, user.phoneNumber ?? null),
    email: user.email.endsWith('@phone.invalid') ? null : user.email,
    phoneNumber: user.phoneNumber ?? null,
  }
}
