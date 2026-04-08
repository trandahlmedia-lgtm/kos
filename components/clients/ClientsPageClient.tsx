'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClientCard } from './ClientCard'
import { NewClientDialog } from './NewClientDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { type Client } from '@/types'

interface ClientsPageClientProps {
  clients: Client[]
  profiles: { id: string; name: string }[]
}

export function ClientsPageClient({ clients, profiles }: ClientsPageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const producerMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]))

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Clients</h1>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 px-3 text-sm"
        >
          <Plus size={14} className="mr-1.5" />
          New Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add your first client to get started."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              producerName={client.primary_producer ? producerMap[client.primary_producer] : undefined}
            />
          ))}
        </div>
      )}

      <NewClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profiles={profiles}
      />
    </>
  )
}
