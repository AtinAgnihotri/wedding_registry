# PRP-000 — Parent: TanStack Start Migration

## Goal

Replace the static site (`index.html` + `app.js` + Apps Script JSONP) with a **TanStack Start** app that:

- Keeps guest-facing product behavior
- Stores gifts in an **owned Google Sheet** via **Sheets API + service account** (secrets server-only)
- Adds optional **Better Auth** (phone OTP primary for India, plus Google/Facebook)
- Adds **bot protection** (Turnstile, CSRF, rate limits)

## Current system (source of truth for behavior)

- UI: [`index.html`](../index.html), [`styles.css`](../styles.css), [`resources/`](../resources/)
- Client logic: [`app.js`](../app.js) — list/filter, reserve (≤5), release via localStorage codes, suggest gift, optimistic sync
- Backend today: [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) + public web app URL in [`config.js`](../config.js)
- Local fallback: `localStorage` keys `wedding-gift-registry`, `wedding-gift-release-codes`

## Target architecture

```
Browser (React + ShadCN UI)
  → TanStack Start server functions /auth routes
    → Google Sheets API (service account)  // gifts
    → Neon Postgres (Better Auth)          // users/sessions only
    → MSG91 (OTP SMS)
    → Cloudflare Turnstile
```

### Shared contracts (do not rename casually)

**Server functions**

- `listGifts`
- `addGift`
- `reserveGift`
- `releaseGift`

**Gift row / JSON shape** (Sheet tab `Gifts`)

- Columns: `id`, `name`, `category`, `price`, `description`, `link`, `reservedBy`, `message`, `releaseCode`, `reservations`, `createdAt`, `updatedAt`
- Max reservations per gift: `5`
- Currency display: INR (`en-IN`)

**Release ownership**

- Anonymous: HttpOnly cookie (not `localStorage`)
- Logged-in: `userId` on reservation; session can release
- Admin: server-only admin key / role

**Env vars (server)**

- `GOOGLE_SERVICE_ACCOUNT_JSON` (or path)
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `DATABASE_URL` (Neon)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` / `BASE_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`
- `MSG91_AUTH_KEY` (+ template/sender as needed)
- `TURNSTILE_SECRET_KEY`
- `ADMIN_KEY` (optional)
- Client-public: `VITE_TURNSTILE_SITE_KEY` (or Start equivalent), OAuth client IDs if required by client SDK

## Defaults locked

- Guest writes stay open (browse + reserve + suggest without login)
- Phone OTP primary (E.164 default `+91`) via MSG91
- Social P0: Google + Facebook; Instagram later (not launch-blocking)
- Host: Node/Nitro (Fly / Render / Railway) — not GitHub Pages
- Auth DB: Neon + Drizzle; gifts stay in Sheets

## Tool split

| Work | Owner |
|------|--------|
| Scaffold plumbing, Sheets migration, server fns, auth, bot protection, cutover | **Devin** — [001](./001-devin-scaffold-and-sheets.md), [002](./002-devin-auth-and-bot-protection.md), [004](./004-devin-cutover.md) |
| UI port, visual polish, auth sheet look-and-feel | **Cursor** — [003](./003-cursor-ui-port.md) |

## Definition of done (whole migration)

- [ ] No Apps Script `/exec` URL required for production
- [ ] No secrets in client bundle or git
- [ ] Guests can reserve/release/suggest; optional login works (OTP + Google + Facebook)
- [ ] Turnstile + rate limits on mutate/OTP
- [ ] UI preserves Mitthu & Atin composition and current sections
- [ ] Old static path can be retired after DNS cutover
