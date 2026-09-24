# Security notes

The threat model for a multi-user, real-time collaboration app: who may see
or change which board, and can two users' actions interfere?

## Trust boundaries and assets

| Asset | Where | Why it matters |
|---|---|---|
| Board / card content | Postgres | Confidentiality between workspaces; integrity of edits |
| Credentials | `users.password_hash`, refresh tokens | Account takeover |
| Real-time streams | Socket.IO rooms, Redis channels | A wrong room = a data leak to the wrong user |

Everything from the browser is untrusted: request bodies, path IDs, the
`boardId` in `board:join`, and any role/user claim the client sends.

## Threats and mitigations

| # | Threat | Mitigation |
|---|---|---|
| 1 | **Broken access control (IDOR)** — user fetches/edits `/cards/:id` from a workspace they don't belong to | Every handler resolves the resource → its workspace → the caller's `memberships` row *server-side*. Return **404, not 403**, for resources the caller can't access (don't leak existence) |
| 2 | **Privilege escalation** — a `member` deletes cards / changes roles | RBAC middleware reads the role from `memberships` on every request (not from the JWT). Delete card/board, change role, remove member require `owner`/`admin`. Guard the last-owner case (can't demote or remove the final owner) |
| 3 | **WebSocket room hijack** — `board:join` for a board you can't access | The gateway authenticates the socket at handshake (JWT) and **re-checks membership on every `board:join`**; reject otherwise. Events only go to rooms; never broadcast to all sockets |
| 4 | **Stale/expired token on a live socket** | Validate the access token at handshake; on expiry the client reconnects with a fresh token (or the server disconnects sockets whose token has expired) |
| 5 | **Password attacks** | bcrypt (cost ≥ 12) or argon2id; login/register rate-limited per IP and per email; identical error for unknown email vs wrong password; minimum length ≥ 10 |
| 6 | **Token theft (XSS)** | Access token in memory only (never `localStorage`); refresh token `httpOnly` + `Secure` + `SameSite=Strict` cookie scoped to `/api/auth`; React escapes output — never `dangerouslySetInnerHTML` card/comment text |
| 7 | **Refresh-token replay** | Rotation on every use; tokens stored only as SHA-256 hashes; **reuse of an already-rotated token revokes the whole family** |
| 8 | **CSRF** | Refresh endpoint is cookie-authenticated → `SameSite=Strict` + require a custom header / check `Origin`; all other endpoints use the `Authorization` header (not sent automatically) so CSRF doesn't apply |
| 9 | **CORS misconfiguration** | Explicit allow-list of the frontend origin with `credentials: true`; never `*` with credentials; same allow-list for Socket.IO |
| 10 | **Injection** | Parameterised queries only; validate every body/params with a schema (zod); labels constrained by a DB `CHECK`; card text stored as data, rendered as text |
| 11 | **Lost update / data integrity** | Optimistic locking with `WHERE version = ?` — a *security-adjacent* control: two users can't silently overwrite each other |
| 12 | **Abuse / DoS** | Rate-limit comment and card creation per user (stretch goal in the backend guide); body size limits (16 KB JSON); cap comment length (5 000) and cards per column; Socket.IO `maxHttpBufferSize`, ping timeouts; per-user socket cap |
| 13 | **Sensitive data in logs** | Never log passwords, tokens, cookies, or full card bodies; structured logs with request IDs |
| 14 | **Redis exposure** — pub/sub carries card content | Private network + `requirepass`/ACL; TLS across hosts. Events contain only what the room's members may already see |
| 15 | **Enumeration** via register (`409` on existing email) | Accepted trade-off for UX (the API contract specifies `409`); mitigate with rate limiting. Document it |

## Secrets & configuration

- Everything from environment variables (`backend/.env.example` lists them); `.env` is git-ignored.
- Separate secrets for JWT signing and cookie signing; rotate on a schedule.
- Run containers as non-root; enable dependency scanning (Dependabot / `npm audit`).

## Out of scope (documented, not solved)

SSO/OAuth, MFA, audit logging beyond the stretch-goal activity log, end-to-end
encryption, data-residency/compliance certifications.
