# PRP-003 — Cursor: UI Port + Taste

**Owner:** Cursor  
**Depends on:** [001](./001-devin-scaffold-and-sheets.md) stubs (server fn names stable); auth shell from [002](./002-devin-auth-and-bot-protection.md) when styling login  
**Does not own:** Sheets/auth/bot backend implementation

## Objective

Port the existing wedding registry UI into TanStack Start + ShadCN with **maximum visual continuity** and tasteful polish. Preserve the Mitthu & Atin composition. Inside Cursor, **UI design work uses Opus 5.5 subagents with the Claude design skill**.

## In scope

1. Port sections from [`index.html`](../index.html) / [`styles.css`](../styles.css):
   - Intro / hero (reuse [`resources/hero-couple.jpg`](../resources/hero-couple.jpg))
   - Summary tiles (available / reserved / all)
   - Search + category tabs
   - Gift grid + reservation meter + actions
   - Suggest-a-gift panel
   - Reserve dialog
2. ShadCN theming via CSS variables—avoid generic purple/AI-default looks; follow existing brand direction in `styles.css`.
3. Wire UI to Devin’s server functions + TanStack Query (optimistic update + rollback, same spirit as `saveGiftChange` in [`app.js`](../app.js)).
4. Auth sheet / sticky Sign-in UX: **phone OTP first**, then Google/Facebook—frictionless for Indian guests; never block the gift grid.
5. Responsive desktop + mobile; intentional motion (2–3 purposeful motions, not noise).
6. Sync/refresh status affordance equivalent to current `#syncStatus` / Refresh button.

## Out of scope

- Implementing Sheets API, service account, Better Auth server config, MSG91, Turnstile verification, rate limit stores
- Deploy/DNS/Apps Script retirement
- Product behavior changes (capacity, currency, anonymous writes) unless product owner asks

## Design dictum

- Opus 5.5 + Claude design skill for visual/design passes
- Do not unilaterally replace Devin’s backend contracts
- Brand-first hero: couple names remain hero-level; no dashboard clutter in first viewport

## Acceptance criteria

- [ ] First viewport reads as one composition (brand, headline, short support, CTA/refresh, dominant image)
- [ ] Feature parity with current guest flows (browse/filter/reserve/release/suggest)
- [ ] Uses ShadCN primitives without looking like a stock dashboard template
- [ ] Auth UI is optional, phone-first, non-blocking
- [ ] Works on mobile and desktop
- [ ] No secrets introduced into client code beyond public site keys

## Reference

- Legacy UI: [`index.html`](../index.html), [`styles.css`](../styles.css)
- Parent contracts: [000](./000-parent-tanstack-migration.md)
