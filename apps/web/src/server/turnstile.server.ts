import { RegistryError } from './gifts.server'

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function isTurnstileEnforced() {
  return (
    Boolean(process.env.TURNSTILE_SECRET_KEY) ||
    process.env.NODE_ENV === 'production'
  )
}

/**
 * Verifies a Turnstile token server-side. Fails closed: in production a missing
 * `TURNSTILE_SECRET_KEY` blocks the request; locally it is skipped when unset.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new RegistryError(
        'Bot protection is not configured. Please try again later.',
      )
    }
    return
  }

  if (!token) {
    throw new RegistryError('Please complete the bot check and try again.')
  }

  let success = false
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const body = (await response.json()) as { success?: boolean }
    success = body.success === true
  } catch {
    throw new RegistryError(
      'Bot check is unavailable right now. Please try again.',
    )
  }

  if (!success) {
    throw new RegistryError('Bot check failed. Please refresh and try again.')
  }
}
