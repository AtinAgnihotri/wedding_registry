# PRP-004 — Devin: Cutover + Retire Legacy

**Owner:** Devin  
**Depends on:** [001](./001-devin-scaffold-and-sheets.md), [002](./002-devin-auth-and-bot-protection.md), [003](./003-cursor-ui-port.md) merged to a releasable state

## Objective

Ship the TanStack Start app to a Node host, migrate Sheet data if needed, point DNS, and retire the Apps Script / static `config.js` public-API path.

## In scope

1. Production deploy (Fly / Render / Railway or equivalent Nitro/Node image).
2. Production env vars set (Sheets SA, Neon, Better Auth, OAuth, MSG91, Turnstile, admin).
3. Confirm Sheet shared with service account; data migrated/compatible with existing headers.
4. Point [`CNAME`](../CNAME) / DNS from static host to new host.
5. Smoke tests:
   - list / reserve / release (cookie + logged-in)
   - add gift
   - phone OTP + Google + Facebook
   - Turnstile failure path
   - admin clear (if enabled)
6. Retire:
   - Apps Script web app dependency for production
   - Client JSONP + public `WEDDING_REGISTRY_API_URL` in [`config.js`](../config.js)
   - Static-only Docker/nginx path **or** replace with Start/Nitro image
7. Document: old `localStorage` release codes do not migrate; couple can admin-clear stuck rows.

## Out of scope

- UI redesign during cutover
- Instagram login launch

## Acceptance criteria

- [ ] Production URL serves Start app
- [ ] Shared registry works for multiple browsers/users
- [ ] No service-account or admin secrets in git or client
- [ ] Legacy Apps Script path documented as deprecated/disabled
- [ ] README updated for new run/deploy instructions

## Handoff note

Update root [`README.md`](../README.md) to point at `prps/` and new deploy flow; keep a short “legacy static” note only if still needed for rollback.
