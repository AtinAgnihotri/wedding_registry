import { useState } from 'react'

/**
 * State for one `<Turnstile />` widget. Tokens are single-use: `consume()` hands the
 * current token to a submit and bumps `resetKey` so the widget issues a fresh one.
 */
export function useTurnstileToken() {
  const [token, setToken] = useState<string>()
  const [resetKey, setResetKey] = useState(0)

  const consume = () => {
    setResetKey((n) => n + 1)
    return token
  }

  return { token, setToken, resetKey, consume }
}
