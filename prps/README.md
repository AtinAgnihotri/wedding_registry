# Wedding Registry — TanStack Start Migration PRPs

Product Requirement Prompts (PRPs) for migrating this static Google Apps Script registry to **TanStack Start**, with **server-only Google Sheets**, **Better Auth** (India-first phone OTP + socials), and **bot protection**.

Multiple tools will execute different slices. Read the parent PRP first, then only the sub-PRP assigned to your tool.

## Ownership

| Owner | Owns | Does not own |
|--------|------|----------------|
| **Cursor** | Tasteful UI: visual design, layout, typography, motion, ShadCN theming, component look-and-feel. Inside Cursor, UI design uses Opus 5.5 + Claude design skill. | Backend migration, Sheets/auth wiring, secrets, deploy grunt work |
| **Devin** | Backend & migration wiring: Start scaffold plumbing, Sheets API + service account, server functions, Better Auth + Neon, Turnstile/CSRF/rate limits, env, cutover | Unilateral UI redesign / “taste” passes |

## Index

| PRP | Owner | Status |
|-----|--------|--------|
| [000-parent-tanstack-migration.md](./000-parent-tanstack-migration.md) | Shared context | Spec |
| [001-devin-scaffold-and-sheets.md](./001-devin-scaffold-and-sheets.md) | Devin | Ready |
| [002-devin-auth-and-bot-protection.md](./002-devin-auth-and-bot-protection.md) | Devin | Ready after 001 |
| [003-cursor-ui-port.md](./003-cursor-ui-port.md) | Cursor | Ready after 001 stubs |
| [004-devin-cutover.md](./004-devin-cutover.md) | Devin | Ready after 002 + 003 |

## Rules for all agents

1. Do not put Google service-account keys, admin keys, or Better Auth secrets in the repo or client bundle.
2. Guests may browse, reserve, and suggest **without** login; login is optional.
3. Preserve current product behavior (max 5 reservations/gift, INR, categories, release ownership) unless a PRP says otherwise.
4. Prefer matching existing Sheet column schema so current gift data can migrate.
5. Coordinate on shared contracts in the parent PRP (`Gift`, server function names, env var names) before changing them.
