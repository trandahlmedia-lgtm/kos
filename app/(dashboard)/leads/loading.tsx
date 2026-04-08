import { Skeleton } from '@/components/ui/skeleton'

const STAGES = 7

export default function LeadsLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-16 bg-[#1a1a1a]" />
          <Skeleton className="h-3 w-10 bg-[#1a1a1a]" />
        </div>
        <Skeleton className="h-8 w-24 bg-[#1a1a1a]" />
      </div>

      <div className="flex gap-4 px-6 py-5 overflow-x-hidden">
        {Array.from({ length: STAGES }).map((_, i) => (
          <div key={i} className="flex flex-col min-w-[220px] w-[220px] shrink-0 gap-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <Skeleton className="h-3 w-20 bg-[#1a1a1a]" />
              <Skeleton className="h-4 w-6 bg-[#1a1a1a]" />
            </div>
            {Array.from({ length: i === 0 ? 3 : i === 1 ? 2 : 1 }).map((_, j) => (
              <Skeleton key={j} className="h-[72px] w-full bg-[#1a1a1a] rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
