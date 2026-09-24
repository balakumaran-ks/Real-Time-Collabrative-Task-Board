import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleBadge } from '@/components/ui/Badge'
import { client } from '@/lib/client'
import type { Workspace } from '@/lib/types'

export function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    client.getWorkspaces().then((data) => {
      setWorkspaces(data)
      setLoading(false)
    })
  }, [])

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Your workspaces</h1>
        <p className="text-sm text-ink-muted">Pick a workspace to see its boards.</p>
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => navigate(`/workspaces/${ws.id}/boards`)}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-left shadow-sm hover:border-brand/50 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-ink">{ws.name}</h3>
              <ChevronRight size={16} className="text-ink-muted" />
            </div>
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Users size={14} /> {ws.memberCount} members
              </span>
              <RoleBadge role={ws.role} />
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  )
}
