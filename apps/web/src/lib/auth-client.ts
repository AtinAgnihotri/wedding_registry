import { createAuthClient } from 'better-auth/react'
import { phoneNumberClient } from 'better-auth/client/plugins'

/** Browser auth client. Session: `authClient.useSession()`; OTP: `authClient.phoneNumber.*`. */
export const authClient = createAuthClient({
  plugins: [phoneNumberClient()],
})

/** Better Auth's captcha plugin reads the Turnstile token from this header. */
export function turnstileHeaders(token: string | undefined) {
  return token ? { 'x-captcha-response': token } : undefined
}
