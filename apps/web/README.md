# Wedding registry — TanStack Start app (`apps/web`)

Backend track of the migration (PRP-001 + PRP-002). The UI here is a deliberately ugly
functional stub; the brand-faithful port is PRP-003 (Cursor). The legacy static site at the
repo root stays live until PRP-004.

```bash
cd apps/web
pnpm install
cp .env.example .env   # fill in what you have; see below
pnpm dev               # http://localhost:3000
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

No credentials? `GIFTS_BACKEND=memory pnpm dev` runs the full registry in memory (seeded with the
legacy default gifts). Login is hidden until `DATABASE_URL` + `BETTER_AUTH_SECRET` are set, and
Turnstile is skipped locally until `TURNSTILE_SECRET_KEY` is set.

## Setup

### Google Sheet (service account)

1. Google Cloud console → create a project → enable **Google Sheets API**.
2. IAM → Service accounts → create one → Keys → add JSON key.
3. Open the registry Sheet → **Share** → add the key's `client_email` as **Editor**.
4. Set `GOOGLE_SHEETS_SPREADSHEET_ID` (from the Sheet URL) and `GOOGLE_SERVICE_ACCOUNT_JSON`
   (single-line JSON or base64 of the file). The existing `Gifts` tab and headers
   (`id,name,category,price,description,link,reservedBy,message,releaseCode,reservations,createdAt,updatedAt`)
   are reused as-is; missing headers are appended, an empty tab is seeded with the default gifts.

### Neon (auth database)

1. Create a Neon project; copy the **pooled** connection string into `DATABASE_URL`.
2. `openssl rand -base64 32` → `BETTER_AUTH_SECRET`; set `BETTER_AUTH_URL` to the public origin.
3. `pnpm db:migrate` applies `drizzle/` (Better Auth tables incl. `rate_limit`).
   After changing auth plugins: `pnpm auth:generate && pnpm db:generate`.

### MSG91 (phone OTP, +91)

1. Create an OTP template with the `##OTP##` variable and get it DLT-approved.
2. Set `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. Better Auth generates/verifies the 6-digit code
   (5 min expiry, 3 attempts); MSG91 only delivers it via `POST /api/v5/otp`.

### Cloudflare Turnstile

Create a widget for your domain(s) → `VITE_TURNSTILE_SITE_KEY` (public) + `TURNSTILE_SECRET_KEY`.

### OAuth redirect URLs

| Provider | Where                                                                       | Value                                           |
| -------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| Google   | Cloud console → Credentials → OAuth client (Web) → Authorized redirect URIs | `${BETTER_AUTH_URL}/api/auth/callback/google`   |
| Facebook | Meta app → Facebook Login → Settings → Valid OAuth Redirect URIs            | `${BETTER_AUTH_URL}/api/auth/callback/facebook` |

Add both `http://localhost:3000/...` (dev) and the staging/prod origin. Instagram is out of scope.

## Security model

- All secrets are server-only (`*.server.ts`, server functions); only `VITE_TURNSTILE_SITE_KEY` reaches the browser.
- Non-GET server functions require same-origin requests (`src/start.ts`, TanStack CSRF middleware); Better Auth checks `trustedOrigins`.
- Release ownership: an HttpOnly `__Host-wr_guest` cookie (`wr_guest` on http://localhost); the Sheet only stores `sha256(giftId:token)`. Signed-in reservations also store `userId`. Nothing in `localStorage`.
- Turnstile on `reserveGift`, `addGift` (server-verified) and `/api/auth/phone-number/send-otp` (Better Auth captcha plugin). Fails closed in production if the secret is missing.
- Rate limits: OTP send 3/min/IP + 3 per 10 min per phone; OTP verify 10/min/IP (Better Auth, stored in Postgres). Gift mutations: reserve 10/min, add 5/min, release 20/min per IP (in-process). Set `TRUSTED_IP_HEADER` to your host's unspoofable client-IP header.
- Sheet writes are serialized in-process with a pre-write re-read and one retry on conflict; the list is cached 60s and invalidated on writes.

## Handoff for Cursor (PRP-003)

**UI port can start on these server functions** (`src/server/gifts.functions.ts`, types in `src/lib/gifts.ts`):

| Function      | Input (`{ data }`)                                                           | Returns                                                   |
| ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `listGifts()` | —                                                                            | `Gift[]` (per-caller `canRelease`, `reservations[].mine`) |
| `addGift`     | `{ name, category?, price?, description?, link?, turnstileToken, website? }` | `{ ok, gift }`                                            |
| `reserveGift` | `{ id, guestName, message?, turnstileToken }`                                | `{ ok, gift }`                                            |
| `releaseGift` | `{ id, adminKey? }`                                                          | `{ ok, gift }`                                            |

Errors are thrown as `Error` with guest-safe messages (show `error.message`). Use `formatINR`,
`isGiftFull`, `MAX_RESERVATIONS_PER_GIFT` from `#/lib/gifts`. `website` is a honeypot — keep the
field hidden and empty.

**Auth sheet can start on these hooks:**

- Session (SSR/loader): `getSession()` from `#/server/session.functions` → `{ user: { id, name, email, phoneNumber } | null, authEnabled, socialProviders: ('google'|'facebook')[] }`. Prefill the reserve form with `user.name`.
- Session (client): `authClient.useSession()` from `#/lib/auth-client`.
- Phone OTP: `authClient.phoneNumber.sendOtp({ phoneNumber: '+91XXXXXXXXXX' }, { headers: turnstileHeaders(token) })` then `authClient.phoneNumber.verify({ phoneNumber, code })` (signs up on first verify).
- Social: `authClient.signIn.social({ provider, callbackURL })`. Sign out: `authClient.signOut()`.
- After any login call `claimMyReservations()` so earlier guest reservations move to the account.
- **Turnstile token**: render `<Turnstile onToken={setToken} resetKey={n} action="..." />` from `#/components/turnstile` and pass the token as `turnstileToken` in `reserveGift`/`addGift` data, or via `turnstileHeaders(token)` (`x-captcha-response`) for OTP send. Tokens are single-use: bump `resetKey` after each submit.

Reference implementations: `src/routes/index.tsx` (registry stub) and `src/routes/auth.tsx` (bare login).
