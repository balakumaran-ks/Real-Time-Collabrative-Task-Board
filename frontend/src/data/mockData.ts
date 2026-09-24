import type {
  AppNotification,
  Board,
  Card,
  Column,
  Comment,
  User,
  Workspace,
  WorkspaceMember,
} from '@/lib/types'

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'You', email: 'you@example.com', avatarColor: '#4f46e5' },
  { id: 'u2', name: 'Priya Nair', email: 'priya@example.com', avatarColor: '#0ea5e9' },
  { id: 'u3', name: 'Dev Kumar', email: 'dev@example.com', avatarColor: '#16a34a' },
  { id: 'u4', name: 'Arjun Rao', email: 'arjun@example.com', avatarColor: '#d97706' },
]

export const MOCK_WORKSPACES: Workspace[] = [
  { id: 'w1', name: 'Placement Prep Team', role: 'owner', memberCount: 4 },
  { id: 'w2', name: 'Side Project — Notes App', role: 'member', memberCount: 2 },
]

export const MOCK_MEMBERS: Record<string, WorkspaceMember[]> = {
  w1: [
    { userId: 'u1', name: 'You', email: 'you@example.com', role: 'owner', avatarColor: '#4f46e5' },
    { userId: 'u2', name: 'Priya Nair', email: 'priya@example.com', role: 'admin', avatarColor: '#0ea5e9' },
    { userId: 'u3', name: 'Dev Kumar', email: 'dev@example.com', role: 'member', avatarColor: '#16a34a' },
    { userId: 'u4', name: 'Arjun Rao', email: 'arjun@example.com', role: 'member', avatarColor: '#d97706' },
  ],
  w2: [
    { userId: 'u1', name: 'You', email: 'you@example.com', role: 'member', avatarColor: '#4f46e5' },
    { userId: 'u2', name: 'Priya Nair', email: 'priya@example.com', role: 'owner', avatarColor: '#0ea5e9' },
  ],
}

export const MOCK_BOARDS: Board[] = [
  {
    id: 'b1',
    workspaceId: 'w1',
    name: 'Sprint 1 — Core API',
    description: 'Auth, boards, cards, WebSocket sync',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b2',
    workspaceId: 'w1',
    name: 'Interview Prep',
    description: 'DSA + system design revision tracker',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b3',
    workspaceId: 'w2',
    name: 'MVP Backlog',
    description: 'Notes app first release',
    updatedAt: new Date().toISOString(),
  },
]

export const MOCK_COLUMNS: Column[] = [
  { id: 'c1', boardId: 'b1', name: 'Backlog', order: 0 },
  { id: 'c2', boardId: 'b1', name: 'In Progress', order: 1 },
  { id: 'c3', boardId: 'b1', name: 'Review', order: 2 },
  { id: 'c4', boardId: 'b1', name: 'Done', order: 3 },
]

const comment = (id: string, cardId: string, authorId: string, authorName: string, body: string, minutesAgo: number): Comment => ({
  id,
  cardId,
  authorId,
  authorName,
  body,
  createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
})

export const MOCK_CARDS: Card[] = [
  {
    id: 'card1',
    boardId: 'b1',
    columnId: 'c1',
    title: 'Design Postgres schema for boards/cards',
    description: 'workspaces -> boards -> columns -> cards -> comments, with cascading permissions.',
    assigneeId: 'u2',
    labels: ['design'],
    dueDate: null,
    order: 0,
    version: 1,
    comments: [],
  },
  {
    id: 'card2',
    boardId: 'b1',
    columnId: 'c1',
    title: 'Set up JWT refresh-token rotation',
    description: 'Access token 15 min, refresh token 7 days in httpOnly cookie.',
    assigneeId: null,
    labels: ['feature'],
    dueDate: null,
    order: 1,
    version: 1,
    comments: [],
  },
  {
    id: 'card3',
    boardId: 'b1',
    columnId: 'c2',
    title: 'WebSocket room-per-board broadcast',
    description: 'Socket.IO room join on board open, emit card:moved / card:updated to room.',
    assigneeId: 'u1',
    labels: ['feature'],
    dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    order: 0,
    version: 2,
    comments: [
      comment('cm1', 'card3', 'u2', 'Priya Nair', 'Remember to dedupe the self-broadcast on the emitting client.', 40),
    ],
  },
  {
    id: 'card4',
    boardId: 'b1',
    columnId: 'c2',
    title: 'Optimistic concurrency (version field on cards)',
    description: 'Reject stale writes with 409 instead of silently overwriting.',
    assigneeId: 'u3',
    labels: ['bug', 'urgent'],
    dueDate: new Date(Date.now() + 1 * 86_400_000).toISOString(),
    order: 1,
    version: 1,
    comments: [],
  },
  {
    id: 'card5',
    boardId: 'b1',
    columnId: 'c3',
    title: 'Presence set in Redis per board',
    description: 'Track {boardId: [userIds]} and broadcast diffs on join/leave.',
    assigneeId: 'u4',
    labels: ['feature'],
    dueDate: null,
    order: 0,
    version: 1,
    comments: [
      comment('cm2', 'card5', 'u4', 'Arjun Rao', 'Using a Redis SET with SADD/SREM, TTL as a safety net for dead sockets.', 120),
      comment('cm3', 'card5', 'u1', 'You', 'Good call on the TTL — nice catch.', 90),
    ],
  },
  {
    id: 'card6',
    boardId: 'b1',
    columnId: 'c4',
    title: 'Auth: signup + login endpoints',
    description: 'bcrypt hashing, validation with zod/pydantic.',
    assigneeId: 'u1',
    labels: ['chore'],
    dueDate: null,
    order: 0,
    version: 3,
    comments: [],
  },
]

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    kind: 'assigned',
    message: 'Priya Nair assigned you "WebSocket room-per-board broadcast"',
    read: false,
    createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
  },
  {
    id: 'n2',
    kind: 'commented',
    message: 'Arjun Rao commented on "Presence set in Redis per board"',
    read: false,
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
  {
    id: 'n3',
    kind: 'moved',
    message: 'Dev Kumar moved "Auth: signup + login endpoints" to Done',
    read: true,
    createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  },
]
