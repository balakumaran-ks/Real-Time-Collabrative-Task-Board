import { Avatar } from '@/components/ui/Avatar'
import type { PresenceUser } from '@/lib/types'

export function PresenceAvatars({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.map((u) => (
          <Avatar key={u.userId} name={u.name} color={u.avatarColor} size="sm" ring />
        ))}
      </div>
      <span className="text-xs text-ink-muted">
        {users.length === 1 ? `${users[0].name} is viewing` : `${users.length} people viewing`}
      </span>
    </div>
  )
}
