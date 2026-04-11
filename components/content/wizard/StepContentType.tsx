'use client'

import type { ContentType } from '@/types'

const CONTENT_TYPES: {
  value: ContentType
  label: string
  description: string
}[] = [
  { value: 'education',      label: 'Educational',       description: 'Tips, how-tos, and helpful information' },
  { value: 'differentiator', label: 'Differentiator',    description: "What makes you better than the competition" },
  { value: 'social_proof',   label: 'Social Proof',      description: 'Reviews, testimonials, and success stories' },
  { value: 'trust',          label: 'Trust Builder',     description: 'Your story, values, or service guarantees' },
  { value: 'before_after',   label: 'Before & After',    description: 'Visual transformations and project results' },
  { value: 'bts',            label: 'Behind the Scenes', description: 'Your process, team, or day-to-day work' },
  { value: 'seasonal',       label: 'Seasonal',          description: 'Content tied to current season or timing' },
  { value: 'offer',          label: 'Offer / Promotion', description: 'Limited-time deals or special packages' },
]

interface StepContentTypeProps {
  onSelect: (contentType: ContentType) => void
  selected: ContentType | ''
}

export function StepContentType({ onSelect, selected }: StepContentTypeProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-1 mb-8 text-center">
        <h2 className="text-xl font-semibold text-white">What type of content is this?</h2>
        <p className="text-sm text-[#999999]">This shapes the angle and caption the AI suggests</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CONTENT_TYPES.map((ct) => {
          const isSelected = selected === ct.value
          return (
            <button
              key={ct.value}
              onClick={() => onSelect(ct.value)}
              className={`text-left rounded-md px-4 py-3 border transition-colors focus:outline-none ${
                isSelected
                  ? 'bg-[#111111] border-[#E8732A] text-white'
                  : 'bg-[#111111] border-[#2a2a2a] text-[#999999] hover:border-[#E8732A]/50 hover:text-white'
              }`}
            >
              <p className="text-sm font-semibold leading-snug">{ct.label}</p>
              <p className="text-xs text-[#555555] mt-0.5 leading-tight">{ct.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
