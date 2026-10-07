export const MAX_RESERVATIONS_PER_GIFT = 5

export const DEFAULT_CATEGORIES = ['Home', 'Kitchen', 'Experiences', 'Decor']

export interface PublicReservation {
  name: string
  message: string
  createdAt: string
  /** True when the current browser (cookie) or signed-in user owns this reservation. */
  mine: boolean
}

export interface Gift {
  id: string
  name: string
  category: string
  price: number
  description: string
  link: string
  reservedBy: string
  message: string
  reservations: Array<PublicReservation>
  createdAt: string
  updatedAt: string
  /** True when the caller can release at least one reservation on this gift. */
  canRelease: boolean
}

export interface AddGiftInput {
  name: string
  category?: string
  price?: number
  description?: string
  link?: string
  turnstileToken?: string
  /** Honeypot field; must stay empty. */
  website?: string
}

export interface ReserveGiftInput {
  id: string
  guestName: string
  message?: string
  turnstileToken?: string
}

export interface ReleaseGiftInput {
  id: string
  adminKey?: string
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatINR(value: number) {
  return currencyFormatter.format(value)
}

export function isGiftFull(gift: Pick<Gift, 'reservations'>) {
  return gift.reservations.length >= MAX_RESERVATIONS_PER_GIFT
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return ''
    }

    if (!url.hostname.includes('.')) {
      return ''
    }

    return url.href
  } catch {
    return ''
  }
}
