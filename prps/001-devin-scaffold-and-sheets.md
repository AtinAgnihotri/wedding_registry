# PRP-001 — Devin: Scaffold + Google Sheets Backend

**Owner:** Devin  
**Depends on:** none  
**Blocks:** 002 (auth), 003 (UI can start once stubs exist), 004 (cutover)

## Objective

Stand up TanStack Start and replace Apps Script/JSONP with **server-only** Google Sheets access via a service account. Expose typed server functions that match parent contracts. Leave UI taste to Cursor—provide working stubs/routes Cursor can style.

## In scope

1. Create TanStack Start (React) app in-repo (prefer `apps/web` or root replacement agreed in PR description).
2. Add Tailwind + shadcn/ui **primitives installed** (Dialog, Button, Input, Textarea, Tabs, Badge, Form)—default theme is fine; Cursor owns visual theming.
3. `.env.example` documenting all server secrets; never commit real keys.
4. Google Sheets client using `googleapis` + service account from env.
5. Sheet tab `Gifts` with existing headers (see parent PRP).
6. Implement server functions:
   - `listGifts` — short TTL server cache (~60s), invalidate on writes
   - `addGift`
   - `reserveGift` — capacity ≤ 5; return release material only to caller; store hashed release codes in Sheet
   - `releaseGift` — cookie / (later) userId / admin
7. Anonymous release via **HttpOnly cookie** (migrate off `localStorage` release codes).
8. Optimistic concurrency: read-modify-write + capacity check; one retry on conflict.
9. Minimal functional page/route that can list gifts and call mutations (ugly OK).
10. CSRF middleware for non-GET server functions when defining custom `src/start.ts`.

## Out of scope

- Visual redesign, typography, motion, brand polish (Cursor / PRP-003)
- Better Auth, MSG91, OAuth (PRP-002)
- Turnstile / rate limits (PRP-002)
- DNS cutover / retiring Apps Script (PRP-004)

## Acceptance criteria

- [ ] `listGifts` / `addGift` / `reserveGift` / `releaseGift` work against a real Sheet with service account (documented setup steps)
- [ ] Service account JSON never appears in client bundle or committed files
- [ ] Release codes not stored in `localStorage`
- [ ] Max 5 reservations enforced server-side
- [ ] Existing Sheet schema preserved for data migration
- [ ] Cursor can mount UI against the same server function names without renaming

## Reference files (legacy behavior)

- [`app.js`](../app.js) — `saveGiftChange`, reservation helpers, filters
- [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) — actions, headers, locks, cache

## Suggested deliverables

```
apps/web/ (or agreed root)
  src/server/sheets.ts
  src/server/gifts.functions.ts
  src/routes/index.tsx          # functional stub
  .env.example
```
