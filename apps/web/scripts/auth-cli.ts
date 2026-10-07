// Entry for `pnpm auth:generate` (Better Auth CLI). Not imported by the app.
import { createAuth } from '../src/server/auth.server'

export const auth = createAuth()
