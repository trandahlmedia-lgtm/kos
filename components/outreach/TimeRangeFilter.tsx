'use client'

export type TimeRange = '7d' | '30d' | '3m' | '6m' | '9m' | '12m' | 'all'

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '9m', label: '9m' },
  { value: '12m', label: '12m' },
  { value: 'all', label: 'All' },
]

interface TimeRangeFilterProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
}

export function getCutoffDate(range: TimeRange): Date | null {
  if (range === 'all') return null
  const now = new Date()
  switch (range) {
    case '7d': now.setDate(now.getDate() - 7); break
    case '30d': now.setDate(now.getDate() - 30); break
    case '3m': now.setMonth(now.getMonth() - 3); break
    case '6m': now.setMonth(now.getMonth() - 6); break
    case '9m': now.setMonth(now.getMonth() - 9); break
    case '12m': now.setFullYear(now.getFullYear() - 1); break
  }
  return now
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            value === opt.value
              ? 'bg-[#E8732A]/15 text-[#E8732A] border border-[#E8732A]/30'
              : 'text-[#555555] hover:text-[#999999] border border-transparent hover:border-[#2a2a2a]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
