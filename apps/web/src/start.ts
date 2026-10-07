import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

// Same-origin check (Sec-Fetch-Site / Origin / Referer) for every mutating server function.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) =>
    ctx.handlerType === 'serverFn' && ctx.request.method !== 'GET',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}))
