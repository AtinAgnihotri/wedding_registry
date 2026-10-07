import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  string | undefined

let scriptPromise: Promise<void> | undefined
function loadScript() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Bare Turnstile widget. Calls `onToken` with a fresh token (or `undefined` when it
 * expires). Tokens are single-use: bump `resetKey` after each submit to get a new one.
 * Renders nothing when `VITE_TURNSTILE_SITE_KEY` is unset (local dev).
 */
export function Turnstile({
  onToken,
  action,
  resetKey = 0,
}: {
  onToken: (token: string | undefined) => void
  action?: string
  resetKey?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return
    let widgetId: string | undefined
    let cancelled = false
    void loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      widgetId = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(undefined),
        'error-callback': () => onTokenRef.current(undefined),
      })
    })
    return () => {
      cancelled = true
      onTokenRef.current(undefined)
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [action, resetKey])

  return TURNSTILE_SITE_KEY ? <div ref={ref} /> : null
}
