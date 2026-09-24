import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/Badge'
import { client } from '@/lib/client'
import type { WorkspaceMember } from '@/lib/types'

export function MembersPage() {
  const { workspaceId = '' } = useParams()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    client.getMembers(workspaceId).then(setMembers)
  }, [workspaceId])

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-ink-muted hover:text-ink cursor-pointer"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <h1 className="mb-6 text-xl font-semibold text-ink">Members</h1>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} color={m.avatarColor} size="sm" />
              <div>
                <p className="text-sm font-medium text-ink">{m.name}</p>
                <p className="text-xs text-ink-muted">{m.email}</p>
              </div>
            </div>
            <RoleBadge role={m.role} />
          </div>
        ))}
      </div>
    </AppShell>
  )
}
