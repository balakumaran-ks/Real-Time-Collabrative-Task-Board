import {
  MOCK_BOARDS,
  MOCK_CARDS,
  MOCK_COLUMNS,
  MOCK_MEMBERS,
  MOCK_NOTIFICATIONS,
  MOCK_USERS,
  MOCK_WORKSPACES,
} from '@/data/mockData'
import { EventBus } from '@/lib/eventBus'
import type {
  AppNotification,
  Board,
  Card,
  Column,
  Comment,
  PresenceUser,
  SocketEvent,
  User,
  Workspace,
  WorkspaceMember,
} from '@/lib/types'

// In-memory stand-in for the backend so the UI is fully demoable before
// a real API exists. Every function here has the same shape/signature the
// real `lib/api.ts` client will have — swapping mocks for the real thing
// later is a one-line change in `lib/client.ts`, nothing in the UI changes.

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

let users = [...MOCK_USERS]
let workspaces = [...MOCK_WORKSPACES]
let members = { ...MOCK_MEMBERS }
let boards = [...MOCK_BOARDS]
let columns = [...MOCK_COLUMNS]
let cards = [...MOCK_CARDS]
let notifications = [...MOCK_NOTIFICATIONS]

export const socketBus = new EventBus<SocketEvent>()

let currentUser: User | null = null

export async function mockLogin(email: string, _password: string) {
  await delay()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? users[0]
  currentUser = user
  return { user, accessToken: 'mock-access-token' }
}

export async function mockRegister(name: string, email: string, _password: string) {
  await delay()
  const user: User = {
    id: `u${users.length + 1}`,
    name,
    email,
    avatarColor: ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#db2777'][users.length % 5],
  }
  users = [...users, user]
  currentUser = user
  return { user, accessToken: 'mock-access-token' }
}

export function mockCurrentUser() {
  return currentUser
}

export function mockLogout() {
  currentUser = null
}

export async function mockGetWorkspaces(): Promise<Workspace[]> {
  await delay()
  return workspaces
}

export async function mockGetMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  await delay()
  return members[workspaceId] ?? []
}

export async function mockGetBoards(workspaceId: string): Promise<Board[]> {
  await delay()
  return boards.filter((b) => b.workspaceId === workspaceId)
}

export async function mockGetBoard(boardId: string) {
  await delay()
  const board = boards.find((b) => b.id === boardId)
  const boardColumns = columns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order)
  const boardCards = cards.filter((c) => c.boardId === boardId)
  return { board, columns: boardColumns, cards: boardCards }
}

export async function mockCreateCard(boardId: string, columnId: string, title: string): Promise<Card> {
  await delay(150)
  const order = cards.filter((c) => c.columnId === columnId).length
  const card: Card = {
    id: `card${cards.length + 1}-${Date.now()}`,
    boardId,
    columnId,
    title,
    description: '',
    assigneeId: null,
    labels: [],
    dueDate: null,
    order,
    version: 1,
    comments: [],
  }
  cards = [...cards, card]
  socketBus.emit({ type: 'card:created', card })
  return card
}

export async function mockMoveCard(cardId: string, columnId: string, order: number) {
  await delay(100)
  cards = cards.map((c) => (c.id === cardId ? { ...c, columnId, order, version: c.version + 1 } : c))
  socketBus.emit({ type: 'card:moved', cardId, columnId, order })
}

export async function mockUpdateCard(
  cardId: string,
  patch: Partial<Pick<Card, 'title' | 'description' | 'assigneeId' | 'labels' | 'dueDate'>>,
  expectedVersion: number,
): Promise<{ ok: true; card: Card } | { ok: false; reason: 'conflict' }> {
  await delay(150)
  const existing = cards.find((c) => c.id === cardId)
  if (!existing) throw new Error('Card not found')
  if (existing.version !== expectedVersion) {
    return { ok: false, reason: 'conflict' }
  }
  const updated: Card = { ...existing, ...patch, version: existing.version + 1 }
  cards = cards.map((c) => (c.id === cardId ? updated : c))
  socketBus.emit({ type: 'card:updated', card: updated })
  return { ok: true, card: updated }
}

export async function mockDeleteCard(cardId: string) {
  await delay(150)
  cards = cards.filter((c) => c.id !== cardId)
  socketBus.emit({ type: 'card:deleted', cardId })
}

export async function mockAddComment(cardId: string, body: string): Promise<Comment> {
  await delay(150)
  const author = currentUser ?? users[0]
  const comment: Comment = {
    id: `cm${Date.now()}`,
    cardId,
    authorId: author.id,
    authorName: author.name,
    body,
    createdAt: new Date().toISOString(),
  }
  cards = cards.map((c) => (c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c))
  socketBus.emit({ type: 'comment:created', comment })
  return comment
}

export async function mockCreateColumn(boardId: string, name: string): Promise<Column> {
  await delay(150)
  const order = columns.filter((c) => c.boardId === boardId).length
  const column: Column = { id: `col${Date.now()}`, boardId, name, order }
  columns = [...columns, column]
  return column
}

export async function mockGetNotifications(): Promise<AppNotification[]> {
  await delay()
  return notifications
}

export async function mockMarkNotificationRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
}

// Simulates two teammates joining the board a moment after you do, and
// occasionally moving a card, so the presence/live-update UI has
// something to show even with a single browser tab open.
export function mockSimulatePresence(boardId: string) {
  const teammates: PresenceUser[] = [
    { userId: 'u2', name: 'Priya Nair', avatarColor: '#0ea5e9' },
    { userId: 'u3', name: 'Dev Kumar', avatarColor: '#16a34a' },
  ]
  const timers: ReturnType<typeof setTimeout>[] = []
  let present: PresenceUser[] = []

  timers.push(
    setTimeout(() => {
      present = [teammates[0]]
      socketBus.emit({ type: 'presence:sync', users: present })
    }, 1200),
  )
  timers.push(
    setTimeout(() => {
      present = [...present, teammates[1]]
      socketBus.emit({ type: 'presence:sync', users: present })
    }, 3500),
  )

  return () => {
    timers.forEach(clearTimeout)
    void boardId
  }
}
