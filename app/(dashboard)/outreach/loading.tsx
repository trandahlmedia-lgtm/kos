import { Skeleton } from '@/components/ui/skeleton'

export default function OutreachLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24 bg-[#1a1a1a]" />
          <Skeleton className="h-3 w-16 bg-[#1a1a1a]" />
        </div>
        <Skeleton className="h-8 w-20 bg-[#1a1a1a]" />
      </div>

      <div className="px-6 py-4">
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 bg-[#1a1a1a] rounded-md" />
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] w-full bg-[#1a1a1a] rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}
