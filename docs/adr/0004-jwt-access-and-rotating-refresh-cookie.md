# ADR-0004: Short-lived in-memory JWT + rotating httpOnly refresh cookie

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The SPA needs authenticated REST calls and an authenticated WebSocket. Tokens
stored in `localStorage` are readable by any XSS payload; long-lived bearer
tokens are costly to steal *and* hard to revoke.

## Decision

- **Access token:** JWT, ~15 minutes, returned in the JSON body, kept **in
  memory only** by the SPA (`Authorization: Bearer …`). Claims: `sub`, `exp`;
  **no role claim** — roles are read from `memberships` on each request.
- **Refresh token:** opaque random value in an **httpOnly, Secure,
  SameSite=Strict** cookie scoped to the auth path; stored server-side as a
  SHA-256 hash with a `family_id`. **Rotated on every use.** Presenting an
  already-rotated token is treated as theft → the whole family is revoked.
- Page reload → the SPA calls `POST /auth/refresh` to obtain a new access token.

## Alternatives considered

| Option | Why not |
|---|---|
| JWT in `localStorage` | One XSS = full account takeover |
| Server-side sessions only | Simple and revocable, but every request hits the session store and the API contract is already bearer-token based |
| Long-lived access JWT | No practical revocation |
| Role in JWT claims | Stale for up to 15 min after a role change/removal — unacceptable for RBAC |
| OAuth/OIDC provider | Out of scope; a natural future replacement behind the same endpoints |

## Consequences

- ✅ XSS can't exfiltrate a long-lived credential; stolen refresh cookies are detected on reuse.
- ✅ Revocation and role changes take effect immediately (DB-backed role checks; refresh rows revocable).
- ⚠️ Every page load costs one refresh round trip.
- ⚠️ Needs CSRF care on the refresh endpoint (`SameSite=Strict` + `Origin`/custom-header check) and an explicit CORS allow-list with credentials.
- ⚠️ The frontend does not yet auto-retry a `401` via `/auth/refresh` — a documented frontend stretch goal.
