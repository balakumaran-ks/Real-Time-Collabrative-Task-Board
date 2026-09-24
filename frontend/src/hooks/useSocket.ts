import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { USE_MOCKS } from '@/lib/client'
import { mockSimulatePresence, socketBus } from '@/lib/mockBackend'
import type { SocketEvent } from '@/lib/types'

/**
 * Joins the real-time room for a board and streams SocketEvents to the
 * given handler. Backed by the mock event bus in mock mode, and by a real
 * Socket.IO connection (room = board id) once the backend exists — see
 * backend/README.md for the exact event contract this expects.
 */
export function useBoardSocket(boardId: string | undefined, onEvent: (event: SocketEvent) => void) {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!boardId) return

    if (USE_MOCKS) {
      const unsubscribe = socketBus.subscribe((event) => handlerRef.current(event))
      const stopPresence = mockSimulatePresence(boardId)
      return () => {
        unsubscribe()
        stopPresence()
      }
    }

    const socket: Socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:4000', {
      withCredentials: true,
    })

    socket.emit('board:join', { boardId })

    const events: SocketEvent['type'][] = [
      'card:created',
      'card:updated',
      'card:moved',
      'card:deleted',
      'comment:created',
      'presence:sync',
      'notification:new',
    ]
    events.forEach((type) => {
      socket.on(type, (payload: object) => handlerRef.current({ type, ...payload } as SocketEvent))
    })

    return () => {
      socket.emit('board:leave', { boardId })
      socket.disconnect()
    }
  }, [boardId])
}
