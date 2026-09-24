import axios from 'axios'
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

// Real backend client. Matches the REST contract documented in
// backend/README.md. Swapped in for the mock client automatically once
// VITE_API_URL is set and VITE_USE_MOCKS is not "true" — see lib/client.ts.

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true, // refresh token travels as an httpOnly cookie
})

let accessToken: string | null = null
export function setAccessToken(token: string | null) {
  accessToken = token
}

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export async function login(email: string, password: string) {
  const { data } = await http.post<{ user: User; accessToken: string }>('/auth/login', { email, password })
  return data
}

export async function register(name: string, email: string, password: string) {
  const { data } = await http.post<{ user: User; accessToken: string }>('/auth/register', {
    name,
    email,
    password,
  })
  return data
}

export async function getWorkspaces() {
  const { data } = await http.get<Workspace[]>('/workspaces')
  return data
}

export async function getMembers(workspaceId: string) {
  const { data } = await http.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
  return data
}

export async function getBoards(workspaceId: string) {
  const { data } = await http.get<Board[]>(`/workspaces/${workspaceId}/boards`)
  return data
}

export async function getBoard(boardId: string) {
  const { data } = await http.get<{ board: Board; columns: Column[]; cards: Card[] }>(`/boards/${boardId}`)
  return data
}

export async function createColumn(boardId: string, name: string) {
  const { data } = await http.post<Column>(`/boards/${boardId}/columns`, { name })
  return data
}

export async function createCard(boardId: string, columnId: string, title: string) {
  const { data } = await http.post<Card>(`/columns/${columnId}/cards`, { boardId, title })
  return data
}

export async function moveCard(cardId: string, columnId: string, order: number) {
  await http.patch(`/cards/${cardId}/move`, { columnId, order })
}

export async function updateCard(
  cardId: string,
  patch: Partial<Pick<Card, 'title' | 'description' | 'assigneeId' | 'labels' | 'dueDate'>>,
  expectedVersion: number,
) {
  try {
    const { data } = await http.patch<Card>(`/cards/${cardId}`, { ...patch, version: expectedVersion })
    return { ok: true as const, card: data }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      return { ok: false as const, reason: 'conflict' as const }
    }
    throw err
  }
}

export async function deleteCard(cardId: string) {
  await http.delete(`/cards/${cardId}`)
}

export async function addComment(cardId: string, body: string) {
  const { data } = await http.post<Comment>(`/cards/${cardId}/comments`, { body })
  return data
}

export async function getNotifications() {
  const { data } = await http.get<AppNotification[]>('/notifications')
  return data
}

export async function markNotificationRead(id: string) {
  await http.post(`/notifications/${id}/read`)
}
