import { RegistryError } from './gifts.server'

interface Bucket {
  count: number
  resetAt: number
}

export const MUTATION_LIMITS = {
  reserve: { max: 10, windowMs: 60_000 },
  add: { max: 5, windowMs: 60_000 },
  release: { max: 20, windowMs: 60_000 },
  otpPerPhone: { max: 3, windowMs: 10 * 60_000 },
} as const

export type MutationAction = keyof typeof MUTATION_LIMITS

const buckets = new Map<string, Bucket>()

/**
 * Fixed-window, per-instance limiter for gift mutations (keyed by action + client IP).
 * OTP limits are enforced by Better Auth's database-backed rate limiter instead.
 */
export function enforceRateLimit(
  action: MutationAction,
  key: string,
  now = Date.now(),
) {
  const { max, windowMs } = MUTATION_LIMITS[action]
  const id = `${action}:${key}`
  const bucket = buckets.get(id)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    }
    return
  }

  bucket.count += 1
  if (bucket.count > max) {
    throw new RegistryError(
      'Too many requests. Please wait a minute and try again.',
    )
  }
}

export function resetRateLimitsForTesting() {
  buckets.clear()
}
