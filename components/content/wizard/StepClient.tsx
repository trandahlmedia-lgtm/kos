'use client'

import Image from 'next/image'
import { type Client, type ClientTier } from '@/types'

interface StepClientProps {
  clients: Client[]
  onSelect: (clientId: string, clientName: string) => void
}

const TIER_LABELS: Record<ClientTier, string> = {
  starter: 'Starter',
  basic: 'Basic',
  growth: 'Growth',
  website: 'Website',
  full_service: 'Full Service',
  full_stack: 'Full Stack',
}

export function StepClient({ clients, onSelect }: StepClientProps) {
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-white text-center mb-8">
        Who is this post for?
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {clients.map((client) => {
          const iconUrl = client.brand_logos?.icon ?? null
          const tierLabel = client.tier ? TIER_LABELS[client.tier] : null

          return (
            <button
              key={client.id}
              onClick={() => onSelect(client.id, client.name)}
              className="relative group text-left bg-[#111111] border border-[#2a2a2a] rounded-md p-4 transition-colors hover:border-[#E8732A] focus:outline-none focus:border-[#E8732A]"
            >
              {/* Logo icon — top-right corner */}
              {iconUrl && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
                  <Image
                    src={iconUrl}
                    alt={`${client.name} logo`}
                    width={28}
                    height={28}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}

              {/* Client name */}
              <p className="text-white font-medium text-base leading-snug pr-8">
                {client.name}
              </p>

              {/* Tier badge */}
              {tierLabel && (
                <p className="mt-1 text-[#555555] text-xs">{tierLabel}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
