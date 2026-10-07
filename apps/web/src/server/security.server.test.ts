import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isIndianMobile, normalizeIndianPhone } from './msg91.server'
import {
  enforceRateLimit,
  resetRateLimitsForTesting,
} from './rate-limit.server'
import { verifyTurnstile } from './turnstile.server'

describe('phone normalization', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['12345', null],
    ['5876543210', null],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected)
  })

  it('validates +91 mobiles only', () => {
    expect(isIndianMobile('+919876543210')).toBe(true)
    expect(isIndianMobile('+14155550100')).toBe(false)
  })
})

describe('mutation rate limit', () => {
  beforeEach(() => resetRateLimitsForTesting())

  it('blocks after the per-window max and resets after the window', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i += 1) enforceRateLimit('add', '1.2.3.4', t0)
    expect(() => enforceRateLimit('add', '1.2.3.4', t0)).toThrow(
      'Too many requests',
    )
    expect(() => enforceRateLimit('add', '5.6.7.8', t0)).not.toThrow()
    expect(() => enforceRateLimit('add', '1.2.3.4', t0 + 60_001)).not.toThrow()
  })

  it('limits OTP sends per phone number', () => {
    for (let i = 0; i < 3; i += 1)
      enforceRateLimit('otpPerPhone', '+919876543210')
    expect(() => enforceRateLimit('otpPerPhone', '+919876543210')).toThrow()
  })
})

describe('turnstile', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
    vi.unstubAllGlobals()
  })

  it('is skipped locally when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.NODE_ENV = 'test'
    await expect(verifyTurnstile(undefined)).resolves.toBeUndefined()
  })

  it('fails closed in production without a secret', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.NODE_ENV = 'production'
    await expect(verifyTurnstile('token')).rejects.toThrow('not configured')
  })

  it('requires a token and rejects failed verification', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    await expect(verifyTurnstile(undefined)).rejects.toThrow(
      'complete the bot check',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: false })),
    )
    await expect(verifyTurnstile('bad')).rejects.toThrow('Bot check failed')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true })),
    )
    await expect(verifyTurnstile('good')).resolves.toBeUndefined()
  })
})
