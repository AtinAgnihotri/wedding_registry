/**
 * Header the hosting platform sets to the real client IP and that clients cannot spoof
 * (e.g. `cf-connecting-ip` behind Cloudflare, `x-forwarded-for` on Vercel/Netlify/Fly).
 * Used by both Better Auth's limiter and the gift mutation limiter.
 */
export function trustedIpHeader() {
  return (process.env.TRUSTED_IP_HEADER || 'x-forwarded-for').toLowerCase()
}

export function clientIpFromHeader(value: string | undefined) {
  return value?.split(',')[0]?.trim() || undefined
}
