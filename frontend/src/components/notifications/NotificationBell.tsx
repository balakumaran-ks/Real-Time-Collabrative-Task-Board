import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import clsx from 'clsx'
import { client } from '@/lib/client'
import type { AppNotification } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    client.getNotifications().then(setNotifications)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await client.markNotificationRead(id)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-ink-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-muted">You're all caught up.</div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={clsx(
                  'flex w-full flex-col items-start gap-1 border-b border-border px-4 py-3 text-left text-sm last:border-0 hover:bg-surface-muted cursor-pointer',
                  !n.read && 'bg-brand-soft/40',
                )}
              >
                <span className="flex items-center gap-2 text-ink">
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                  {n.message}
                </span>
                <span className="text-xs text-ink-muted">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
