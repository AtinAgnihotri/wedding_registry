import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { captcha, phoneNumber } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { trustedIpHeader } from './client-ip'
import { getDb, isAuthConfigured } from './db.server'
import { isIndianMobile, sendOtpViaMsg91 } from './msg91.server'
import { enforceRateLimit } from './rate-limit.server'
import { isTurnstileEnforced } from './turnstile.server'

export const OTP_SEND_PATH = '/phone-number/send-otp'

function socialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {}
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.facebook = {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }
  }
  return providers
}

export function enabledSocialProviders() {
  return Object.keys(socialProviders()) as Array<'google' | 'facebook'>
}

export function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL || process.env.BASE_URL

  return betterAuth({
    appName: 'Mitthu & Atin Wedding Registry',
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: baseURL ? [baseURL] : [],
    database: drizzleAdapter(getDb(), { provider: 'pg' }),
    socialProviders: socialProviders(),
    advanced: {
      ipAddress: { ipAddressHeaders: [trustedIpHeader()] },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        [OTP_SEND_PATH]: { window: 60, max: 3 },
        '/phone-number/verify': { window: 60, max: 10 },
        '/sign-in/social': { window: 60, max: 20 },
      },
    },
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        phoneNumberValidator: isIndianMobile,
        sendOTP: async ({ phoneNumber: phone, code }) => {
          try {
            enforceRateLimit('otpPerPhone', phone)
          } catch {
            throw new APIError('TOO_MANY_REQUESTS', {
              message:
                'Too many codes requested for this number. Try again later.',
            })
          }
          await sendOtpViaMsg91(phone, code)
        },
        signUpOnVerification: {
          getTempEmail: (phone) => `${phone.replace(/^\+/, '')}@phone.invalid`,
          getTempName: (phone) => phone,
        },
      }),
      ...(isTurnstileEnforced()
        ? [
            captcha({
              provider: 'cloudflare-turnstile',
              secretKey: process.env.TURNSTILE_SECRET_KEY ?? '',
              endpoints: [OTP_SEND_PATH],
            }),
          ]
        : []),
      // Must stay last so Set-Cookie headers reach TanStack Start's response.
      tanstackStartCookies(),
    ],
  })
}

type Auth = ReturnType<typeof createAuth>
let authInstance: Auth | undefined

/** Lazily built so the guest-only registry keeps working when auth env vars are absent. */
export function getAuth(): Auth | null {
  if (!isAuthConfigured()) {
    return null
  }
  authInstance ??= createAuth()
  return authInstance
}
