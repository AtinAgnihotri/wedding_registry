import { createFileRoute } from '@tanstack/react-router'

import { getAuth } from '#/server/auth.server'

function handle({ request }: { request: Request }) {
  const auth = getAuth()
  if (!auth) {
    return Response.json(
      { message: 'Login is not configured on this deployment.' },
      { status: 503 },
    )
  }
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: handle, POST: handle } },
})
