const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp'

/** Accepts `9876543210`, `09876543210`, `919876543210`, `+91 98765 43210`; returns `+919876543210`. */
export function normalizeIndianPhone(input: string) {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '')
  const local = digits.replace(/^(91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null
}

export function isIndianMobile(phoneNumber: string) {
  return /^\+91[6-9]\d{9}$/.test(phoneNumber)
}

/**
 * Sends a Better Auth-generated code through MSG91's OTP API using a DLT-approved
 * template (`MSG91_TEMPLATE_ID`, with the `##OTP##` variable). Better Auth stores and
 * verifies the code; MSG91 only delivers it.
 */
export async function sendOtpViaMsg91(phoneNumber: string, code: string) {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID

  if (!authKey || !templateId) {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.MSG91_DEV_LOG_OTP === 'true'
    ) {
      console.info(`[msg91:dev] OTP for ${phoneNumber}: ${code}`)
      return
    }
    throw new Error('MSG91_AUTH_KEY / MSG91_TEMPLATE_ID are not configured.')
  }

  const url = new URL(MSG91_OTP_URL)
  url.searchParams.set('template_id', templateId)
  url.searchParams.set('mobile', phoneNumber.replace(/^\+/, ''))
  url.searchParams.set('otp', code)

  const response = await fetch(url, {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(10_000),
  })
  const body = (await response.json().catch(() => ({}))) as {
    type?: string
    message?: string
  }

  if (!response.ok || body.type !== 'success') {
    throw new Error(`MSG91 OTP send failed: ${body.message ?? response.status}`)
  }
}
