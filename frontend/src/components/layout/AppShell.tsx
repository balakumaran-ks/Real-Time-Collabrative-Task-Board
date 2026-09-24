import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuthStore } from '@/store/authStore'

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/workspaces" className="flex items-center gap-2 font-semibold text-ink">
            <LayoutGrid size={18} className="text-brand" />
            TaskBoard
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            {user && <Avatar name={user.name} color={user.avatarColor} size="sm" />}
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
