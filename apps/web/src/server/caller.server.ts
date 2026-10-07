import '@tanstack/react-start/server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { getCookie, getRequestUrl, setCookie } from '@tanstack/react-start/server'

import type { RegistryCaller } from './gifts.server'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function useSecureCookies() {
  const baseUrl = process.env.BETTER_AUTH_URL || process.env.BASE_URL || ''
  if (baseUrl) {
    return baseUrl.startsWith('https://')
  }
  return getRequestUrl().protocol === 'https:'
}

/** `__Host-` requires Secure, so plain-http local dev uses an unprefixed name. */
function guestCookieName() {
  return useSecureCookies() ? '__Host-wr_guest' : 'wr_guest'
}

function isValidToken(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{43}$/.test(value))
}

/** Per-browser secret used to derive hashed release codes. HttpOnly, never exposed to JS. */
export function readGuestToken() {
  const value = getCookie(guestCookieName())
  return isValidToken(value) ? value : undefined
}

export function ensureGuestToken() {
  const existing = readGuestToken()

  if (existing) {
    return existing
  }

  const token = randomBytes(32).toString('base64url')
  setCookie(guestCookieName(), token, {
    httpOnly: true,
    secure: useSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  })
  return token
}

export function isAdminKey(candidate: string | undefined) {
  const expected = process.env.ADMIN_KEY ?? ''

  if (!expected || !candidate) {
    return false
  }

  const a = createHash('sha256').update(candidate).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function getRegistryCaller(
  opts: { createGuestToken?: boolean; adminKey?: string } = {},
): Promise<RegistryCaller> {
  return {
    guestToken: opts.createGuestToken ? ensureGuestToken() : readGuestToken(),
    isAdmin: isAdminKey(opts.adminKey),
  }
}
