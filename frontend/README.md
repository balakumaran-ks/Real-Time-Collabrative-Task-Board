# Frontend — Real-Time Collaborative Task Board

React + TypeScript + Vite + Tailwind CSS v4. Fully working right now
against an in-memory mock backend, so the whole app is clickable before any
real API exists — see the root README and `../backend/README.md`.

## Stack

- React 19 + React Router
- Tailwind CSS v4 (via `@tailwindcss/vite`, no config file needed — theme
  tokens live in `src/index.css`)
- Zustand for auth state (persisted to localStorage in mock mode)
- `@dnd-kit` for the drag-and-drop board
- `react-hook-form` + `zod` for the auth forms
- `socket.io-client` for real-time updates once the backend exists
- `axios` for the real REST client

## Run it

```
npm install
npm run dev
```

Opens on `http://localhost:5173`. Mock mode is on by default (see
`.env.example`) — log in with any email/password, you'll land on a seeded
user with sample workspaces/boards/cards.

## How the mock/real seam works

Every screen calls into `src/lib/client.ts`, never directly into
`src/lib/api.ts` (real HTTP) or `src/lib/mockBackend.ts` (in-memory fake).
`client.ts` picks one based on `VITE_USE_MOCKS`. Same for real-time: the
`useBoardSocket` hook (`src/hooks/useSocket.ts`) subscribes to either a
Socket.IO connection or the mock event bus, transparently to the caller.

Once `backend/` implements the contract in `backend/README.md`, switch
over with no frontend code changes:

```
cp .env.example .env
# edit .env: VITE_USE_MOCKS=false
```

## Structure

```
src/
  components/
    ui/            Button, Input, Modal, Avatar, Badge — plain, no UI kit
    layout/         AppShell (topbar/shell), ProtectedRoute
    board/          BoardColumn, TaskCard, CardModal, PresenceAvatars
    notifications/  NotificationBell
  pages/            Login, Register, Workspaces, Boards, Board, Members
  lib/
    types.ts        Shared data models + WebSocket event shapes
    api.ts           Real REST client (axios)
    mockBackend.ts   In-memory fake backend + fake event bus
    client.ts        The seam — picks real vs. mock
  hooks/useSocket.ts Real-time subscription (real socket or mock bus)
  store/authStore.ts Zustand auth store
  data/mockData.ts   Seed data for mock mode
```

## Notes

- Optimistic concurrency: `CardModal` surfaces a 409 (version conflict) as
  a banner and reloads the latest card — this only does something once the
  real backend enforces the `version` check described in
  `backend/README.md`; the mock backend implements the same check so you
  can see the UI behavior today (rapid edits from the same tab won't
  usually trigger it, since the mock resolves the version bump before your
  next request — a good manual test once the real backend is up is editing
  the same card from two browser windows at once).
- Drag-and-drop reorders/move cards optimistically in local state, then
  calls the API — if you want to see it fail gracefully, that's a good
  spot to add rollback-on-error once the real backend can actually fail.
