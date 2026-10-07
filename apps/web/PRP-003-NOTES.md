# PRP-003 notes

## Requests for Devin

None. The UI uses the server functions and auth client exactly as documented in the README handoff.

## Deviations

- Mutations update the `['gifts']` cache on success (replace by id, or prepend for new gifts) rather than
  optimistically. Reserve and add need a fresh Turnstile token and can fail server-side, so the grid only
  changes once the Sheet write has succeeded.
- Display type is Fraunces + Manrope (Google Fonts) in place of the legacy Georgia / Avenir Next stack, with
  those legacy fonts kept as fallbacks.
