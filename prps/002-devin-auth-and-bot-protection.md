# PRP-002 — Devin: Better Auth + Bot Protection

**Owner:** Devin  
**Depends on:** [001](./001-devin-scaffold-and-sheets.md)  
**Blocks:** 004; informs Cursor auth-sheet wiring in [003](./003-cursor-ui-port.md)

## Objective

Add **optional** login (India-first phone OTP) and harden mutate/OTP paths against bots and abuse. Wire identity into reserve/release when a session exists. Do not redesign auth UI—expose client APIs and a bare shell Cursor will make tasteful.

## In scope

### Auth

1. Better Auth on TanStack Start with `tanstackStartCookies()` last in plugins.
2. Neon Postgres + Drizzle adapter for users/sessions only (not gifts).
3. Mount `auth.handler` on `/api/auth/$`.
4. **Phone OTP** via Better Auth `phoneNumber` plugin + **MSG91** (`sendOTP`); E.164 default `+91`.
5. Social P0: **Google** + **Facebook**.
6. Email magic link / email OTP secondary if cheap; not required for launch.
7. Instagram explicitly **out of launch**; note Meta generic OAuth as follow-up.
8. Optional session on reserve/release:
   - Prefill name when logged in
   - Attach `userId` to reservation JSON in Sheet
   - Allow release by session ownership
9. Optional “claim reservation” after login for anonymous reserves (if straightforward).

### Bot protection

1. Cloudflare Turnstile on `reserve`, `add`, and OTP send (verify server-side).
2. Rate limits: IP + phone for OTP; IP (+ userId if present) for reserve/add.
3. Soft caps / honeypot on suggest form if easy.
4. Keep CSRF + same-origin protections from 001.

## Out of scope

- Auth sheet visual design / frictionless India UX polish (Cursor / PRP-003)
- Instagram provider launch
- Changing gift schema except adding optional `userId` (and related) inside `reservations` JSON

## Acceptance criteria

- [ ] Guests can still reserve/suggest **without** login
- [ ] Phone OTP sign-in works for `+91` numbers via MSG91
- [ ] Google and Facebook OAuth sign-in work in staging
- [ ] Secrets only in server env
- [ ] Turnstile failure blocks mutate/OTP
- [ ] Rate limits prevent rapid OTP spam
- [ ] Logged-in reserve stores `userId`; that user can release without release cookie
- [ ] Minimal unstyled auth entry point exists for Cursor to restyle

## Notes for Cursor handoff

Document:

- How to read session on client
- Where Turnstile widget token must be passed into server functions
- Preferred mount point for Sign-in control (header/intro)—Cursor owns placement aesthetics
